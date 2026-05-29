<?php
ini_set("display_errors", 0);
error_reporting(E_ALL & ~E_DEPRECATED);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Make;
use NFePHP\NFe\Complements;
use NFePHP\NFe\Common\Standardize;
use NFePHP\DA\NFe\Danfce;

require __DIR__ . "/vendor/autoload.php";
date_default_timezone_set("America/Sao_Paulo");

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$app = AppFactory::create();
$app->addBodyParsingMiddleware();

// Add CORS middleware
$app->add(function (Request $request, $handler) {
    $response = $handler->handle($request);
    return $response
        ->withHeader("Access-Control-Allow-Origin", "*")
        ->withHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization",
        )
        ->withHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS",
        )
        ->withHeader("Content-Type", "application/json");
});

// Handle OPTIONS requests for CORS preflight
$app->options("/{routes:.+}", function (Request $request, Response $response) {
    return $response;
});

// Add error middleware to handle 404s
$app->addErrorMiddleware(true, true, true);

// index route
$app->get("/", function (Request $request, Response $response) {
    $response
        ->getBody()
        ->write(
            json_encode(["status" => "ok", "message" => "API NFCe disponível"]),
        );
    return $response
        ->withHeader("Content-Type", "application/json")
        ->withStatus(200);
});

$app->post("/emitir-nfce", function (
    Request $request,
    Response $response,
    $args,
) {
    // 1. Recebe o JSON do Node
    $dadosVenda = $request->getParsedBody();

    // Validação
    if (empty($dadosVenda["products"]) || !is_array($dadosVenda["products"])) {
        $response->getBody()->write(
            json_encode([
                "status" => "erro",
                "mensagem" => "Nenhum produto enviado na venda.",
            ]),
        );
        return $response
            ->withHeader("Content-Type", "application/json")
            ->withStatus(400);
    }

    try {
        $config = [
            "atualizacao" => date("Y-m-d H:i:s"),
            "tpAmb" => (int) $_ENV["APP_ENV"],
            "razaosocial" => $_ENV["EMPRESA_RAZAO_SOCIAL"],
            "cnpj" => $_ENV["EMPRESA_CNPJ"],
            "siglaUF" => $_ENV["EMPRESA_UF"],
            "schemes" => "PL_010_V1.30",
            "versao" => "4.00",
            "tokenIBPT" => "",
            "CSC" => $_ENV["SEFAZ_CSC"],
            "CSCid" => $_ENV["SEFAZ_CSCID"],
            "CSRT" => $_ENV["NFE_CSRT"],
            "CSRTid" => $_ENV["NFE_CSRT_ID"],
        ];

        $caminhoCertificado = $_ENV["CERTIFICADO_PATH"];
        $pfxContent = file_get_contents($caminhoCertificado);
        $certificado = Certificate::readPfx(
            $pfxContent,
            $_ENV["CERTIFICADO_SENHA"],
        );

        $tools = new Tools(json_encode($config), $certificado);
        $tools->model("65");

        $nfe = new Make();

        $std = new \stdClass();
        $std->versao = "4.00";
        $nfe->taginfNFe($std);

        $std = new \stdClass();
        $std->cUF = 41;
        $std->cNF = sprintf("%08d", rand(1, 99999999));
        $std->natOp = "Venda mercadorias de terceiros";
        $std->mod = 65;
        $std->serie = 1;
        $std->nNF = $dadosVenda["numero_nota"];
        $std->dhEmi = date("Y-m-d\TH:i:sP");
        $std->tpNF = 1;
        $std->idDest = 1;
        $std->cMunFG = $_ENV["EMPRESA_CMUN"];
        $std->tpImp = 4;
        $std->tpEmis = 1;
        $std->tpAmb = $_ENV["APP_ENV"];
        $std->finNFe = 1;
        $std->indFinal = 1;
        $std->indPres = 1;
        $std->indIntermed = 0;
        $std->procEmi = 0;
        $std->verProc = "1.0";
        $nfe->tagide($std);

        // =================================================================
        // TRATAMENTO DA DATA DA VENDA
        // =================================================================

        // Puxa a string ISO que veio do Node (Ex: "2026-05-09T20:55:44.241Z")
        $dataIsoNode = $dadosVenda["date"];

        // 1. Cria um objeto de data no PHP em UTC
        $dataVendaObj = new \DateTime($dataIsoNode);

        // 2. Converte o fuso horário
        $fusoHorario = new \DateTimeZone("America/Sao_Paulo");
        $dataVendaObj->setTimezone($fusoHorario);

        // 3. Formata separadamente para o texto da nota
        $dataRealDaVenda = $dataVendaObj->format("d/m/Y"); // Fica "09/05/2026"
        $horaRealDaVenda = $dataVendaObj->format("H:i:s"); // Fica "17:55:44"

        // =================================================================
        // INFORMAÇÕES ADICIONAIS
        // =================================================================
        $std = new \stdClass();

        $std->infCpl =
            "Venda presencial realizada as " .
            $horaRealDaVenda .
            " do dia " .
            $dataRealDaVenda .
            ". Emissao processada em lote.";

        $nfe->taginfAdic($std);

        // =================================================================
        // DADOS DO EMITENTE PUXADOS DO .env
        // =================================================================
        $std = new \stdClass();
        $std->xNome = $_ENV["EMPRESA_RAZAO_SOCIAL"];
        $std->CNPJ = $_ENV["EMPRESA_CNPJ"];
        $std->IE = $_ENV["EMPRESA_IE"];
        $std->CRT = $_ENV["EMPRESA_CRT"];
        $nfe->tagemit($std);

        // =================================================================
        // Dados de endereço puxados do .env
        // =================================================================
        $std = new \stdClass();
        $std->xLgr = $_ENV["EMPRESA_LGR"];
        $std->nro = $_ENV["EMPRESA_NRO"];
        $std->xBairro = $_ENV["EMPRESA_BAIRRO"];
        $std->cMun = $_ENV["EMPRESA_CMUN"];
        $std->xMun = $_ENV["EMPRESA_XMUN"];
        $std->UF = $_ENV["EMPRESA_UF"];
        $std->CEP = $_ENV["EMPRESA_CEP"];
        $std->cPais = "1058";
        $std->xPais = "BRASIL";
        $std->fone = $_ENV["EMPRESA_TELEFONE"];
        $nfe->tagenderEmit($std);

        // =================================================================
        // LOOP DE PRODUTOS
        // =================================================================
        $valorTotalNota = 0.0;
        $valorPago = $dadosVenda["paid_amount"];

        foreach ($dadosVenda["products"] as $index => $item) {
            $numeroItem = $index + 1; // Itens na NFe começam no 1, não no 0

            // Conversão de Strings para Floats
            $qtd = (float) $item["qtd"];
            $preco = (float) $item["price"];
            $totalItem = round($qtd * $preco, 2);

            $valorTotalNota += $totalItem;

            // O Produto
            $std = new \stdClass();
            $std->item = $numeroItem;
            // Se não tiver ID, usa um genérico
            $std->cProd = isset($item["product_id"])
                ? substr((string) $item["product_id"], 0, 60)
                : "001";
            $std->cEAN = !empty($item["barcode"])
                ? $item["barcode"]
                : "SEM GTIN";
            $std->xProd = strtoupper($item["name"] ?? "PRODUTO DIVERSO");

            // IMPORTANTE: Simulando NCM e CFOP
            $std->NCM = $item["ncm"];
            $std->CFOP = $item["cfop"];

            // Verificando se é fracionado (KG) ou unitário (UN)
            $std->uCom =
                strpos((string) $item["qtd"], ".") !== false ? "KG" : "UN";
            $std->qCom = $qtd;
            $std->vUnCom = $preco;
            $std->vProd = $totalItem;
            $std->cEANTrib = $std->cEAN;
            $std->uTrib = $std->uCom;
            $std->qTrib = $qtd;
            $std->vUnTrib = $preco;
            $std->indTot = 1;
            $nfe->tagprod($std);

            // Impostos do Item (Simples Nacional)
            $std = new \stdClass();
            $std->item = $numeroItem;
            $nfe->tagimposto($std); // Abre o grupo de impostos do item

            // 1. ICMS 
            $stdIcms = new \stdClass();
            $stdIcms->item = $numeroItem;
            $stdIcms->orig = isset($item["origin"]) ? $item["origin"] : 0;
            $stdIcms->CSOSN = $item["csosn"];

            if ($item["csosn"] === "102" || $item["csosn"] === "400") {
                // CSOSN 102: Tributada pelo Simples Nacional
                // CSOSN 400: Não tributada (Hortifruti isento, etc)
                // Regra: Não envia base de cálculo nem valor de imposto.
                $nfe->tagICMSSN($stdIcms);
            } elseif ($item["csosn"] === "500") {
                // CSOSN 500: ICMS cobrado anteriormente por ST
                // Regra: O XSD exige a presença das tags de retenção, mesmo que zeradas.
                $stdIcms->vBCSTRet = "0.00";
                $stdIcms->pST = "0.00";
                $stdIcms->vICMSSTRet = "0.00";
                $nfe->tagICMSSN($stdIcms);
            } else {
                // Fallback de segurança: Se o Node mandar um CSOSN em branco ou inválido,
                $stdIcms->CSOSN = "102";
                $nfe->tagICMSSN($stdIcms);
            }
            // PIS 
            $std = new \stdClass();
            $std->item = $numeroItem;
            $std->CST = "49";
            $std->vBC = "0.00";
            $std->pPIS = "0.00";
            $std->vPIS = "0.00";
            $nfe->tagPIS($std);

            // COFINS
            $std = new \stdClass();
            $std->item = $numeroItem;
            $std->CST = "49";
            $std->vBC = "0.0";
            $std->pCOFINS = "0.00";
            $std->vCOFINS = "0.00";
            $nfe->tagCOFINS($std);
        }

        // =================================================================
        // TOTAIS DA NOTA 
        // =================================================================
        $totalFormatado = number_format((float) $valorTotalNota, 2, ".", "");
        $valorPagoFormatado = number_format((float) $valorPago, 2, ".", "");
        $std = new \stdClass();
        $std->vBC = "0.00";
        $std->vICMS = "0.00";
        $std->vICMSDeson = "0.00";
        $std->vFCP = "0.00";
        $std->vBCST = "0.00";
        $std->vST = "0.00";
        $std->vFCPST = "0.00";
        $std->vFCPSTRet = "0.00";
        $std->vProd = $totalFormatado; // Valor total dos produtos
        $std->vFrete = "0.00";
        $std->vSeg = "0.00";
        $std->vDesc = "0.00";
        $std->vII = "0.00";
        $std->vIPI = "0.00";
        $std->vIPIDevol = "0.00";
        $std->vPIS = "0.00";
        $std->vCOFINS = "0.00";
        $std->vOutro = "0.00";
        $std->vNF = $totalFormatado; // Valor total dos produtos menos os descontos
        $nfe->tagICMSTot($std);

        $std = new \stdClass();
        $std->modFrete = 9;
        $nfe->tagtransp($std);

        // =================================================================
        // PAGAMENTO
        // =================================================================
        $std = new \stdClass();
        $std->vTroco = !empty($valorPagoFormatado)
            ? $valorPagoFormatado - $totalFormatado
            : "0.00"; // Evita o erro de NaN na biblioteca
        $nfe->tagpag($std);

        $metodoPagamento = !empty($dadosVenda["payment_method"])
            ? $dadosVenda["payment_method"]
            : "01";

        $std = new \stdClass();

        $std->tPag = $metodoPagamento; // Entra '01', '03', '04', '17', etc.

        $std->vPag = $valorPagoFormatado;

        // Cartão (03, 04) ou PIX (17)
        if (in_array($metodoPagamento, ["03", "04", "17"])) {
            $std->tpIntegra = 2; // 2 = Maquininha avulsa (POS) / PIX avulso

            // Se for Cartão
            if (in_array($metodoPagamento, ["03", "04"])) {
                $std->CNPJ = $_ENV["PAGSEGURO_CNPJ"]; // CNPJ da PagSeguro Instituição de Pagamento
                $std->tBand = "99"; // 99 = Outros (Isenta você de ter que adivinhar a bandeira exata no PDV)
            }
        }

        $nfe->tagdetPag($std);
        // =================================================================
        // Responsável Técnico puxado do .env
        // =================================================================

        $std = new \stdClass();
        $std->CNPJ = $_ENV["RESP_TEC_CNPJ"];
        $std->xContato = $_ENV["RESP_TEC_CONTATO"];
        $std->email = $_ENV["RESP_TEC_EMAIL"];
        $std->fone = $_ENV["RESP_TEC_FONE"];
        $nfe->taginfRespTec($std);

        $xmlOriginal = $nfe->getXML();

        if (!empty($nfe->getErrors())) {
            throw new \Exception(implode(", ", $nfe->getErrors()));
        }

        $xmlAssinado = $tools->signNFe($xmlOriginal);
        $idLote = date("YmdHis");
        $respostaSefaz = $tools->sefazEnviaLote([$xmlAssinado], $idLote, 1);

        $st = new Standardize();
        $stdResposta = $st->toStd($respostaSefaz);

        if (
            $stdResposta->cStat == 104 &&
            isset($stdResposta->protNFe) &&
            $stdResposta->protNFe->infProt->cStat == 100
        ) {
            // 1. Gera o XML Autorizado
            $xmlFinalAutorizado = Complements::toAuthorize(
                $xmlAssinado,
                $respostaSefaz,
            );

            // 2. Salva o XML na pasta para a contabilidade
            $chaveAcesso = $stdResposta->protNFe->infProt->chNFe;
            $caminhoPastaXml = __DIR__ . "/xmls";
            if (!is_dir($caminhoPastaXml)) {
                mkdir($caminhoPastaXml, 0777, true);
            }
            file_put_contents(
                $caminhoPastaXml . "/" . $chaveAcesso . "-nfe.xml",
                $xmlFinalAutorizado,
            );

            // 3. Devolve pro Node
            $payload = json_encode([
                "status" => "sucesso",
                "mensagem" => "NFC-e Autorizada",
                "chave_acesso" => $chaveAcesso, // Adicionei a chave aqui, é útil pro seu Node salvar no banco!
                "numero_recibo" => $stdResposta->protNFe->infProt->nProt,
                "xml" => base64_encode($xmlFinalAutorizado),
            ]);

            $response->getBody()->write($payload);
            return $response
                ->withHeader("Content-Type", "application/json")
                ->withStatus(200);
        } else {
            $motivo = isset($stdResposta->protNFe)
                ? $stdResposta->protNFe->infProt->xMotivo
                : $stdResposta->xMotivo;
            throw new \Exception("Rejeição SEFAZ: " . $motivo);
        }
    } catch (\Exception $e) {
        $response->getBody()->write(
            json_encode([
                "status" => "erro",
                "mensagem" => $e->getMessage(),
            ]),
        );
        return $response
            ->withHeader("Content-Type", "application/json")
            ->withStatus(400);
    }
});

$app->run();
