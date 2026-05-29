<?php

$diretorioEntrada = "/home/bstt/Downloads/Compras/";
$diretorioBase = $diretorioEntrada . "/processados/";
$urlApiBase = "http://localhost:5000";

// 1. Busca todos os XMLs na pasta de entrada
$arquivos = glob($diretorioEntrada . "*.xml");

if (empty($arquivos)) {
    die("Nenhum arquivo encontrado para processar.\n");
}

foreach ($arquivos as $arquivo) {
    $xml = simplexml_load_file($arquivo);

    // 2. Extrai a data de emissão para organizar a pasta (formato: YYYY-MM)
    // A tag dhEmi geralmente vem como: 2026-04-01T10:00:00-03:00
    $dataEmissao = (string) $xml->NFe->infNFe->ide->dhEmi;
    $mesAno = date("Y-m", strtotime($dataEmissao)); // Resultado: 2026-04

    // 3. Define o caminho da pasta de destino
    $pastaDestino = $diretorioBase . $mesAno;

    // 4. Cria a pasta se não existir
    // O 'true' no final permite criar pastas recursivamente
    if (!is_dir($pastaDestino)) {
        mkdir($pastaDestino, 0755, true);
    }

    echo "Processando: " . basename($arquivo) . "... ";

    // 5. Envia para o servidor Node
    $resultado = processarNFCeParaNode($arquivo, $urlApiBase);

    $purchaseOk =
        isset($resultado["purchase_request"]["status_code"]) &&
        in_array($resultado["purchase_request"]["status_code"], [200, 201]);

    if ($purchaseOk) {
        $novoCaminho = $pastaDestino . "/" . basename($arquivo);

        if (rename($arquivo, $novoCaminho)) {
            echo "✅ Enviado e movido para $pastaDestino\n";
        } else {
            echo "⚠️ Enviado, mas erro ao mover arquivo.\n";
        }
    } else {
        echo "❌ Erro ao enviar compra: " .
            ($resultado["purchase_request"]["status_code"] ?? "sem status") .
            " : " .
            ($resultado["purchase_request"]["resposta_servidor"] ??
                ($resultado["purchase_request"]["erro_conexao"] ??
                    "sem resposta")) .
            "\n";
    }
}

// Reutilizando a função de processamento
function processarNFCeParaNode($caminhoXml, $urlDestino)
{
    if (!file_exists($caminhoXml)) {
        return "Arquivo não encontrado.";
    }

    $xml = simplexml_load_file($caminhoXml);

    // O XML da SEFAZ usa namespaces:
    // infNFe contém os dados gerais, ide a emissão, emit o emitente e det os produtos.
    $infNFe = $xml->NFe->infNFe;

    // 1. Extração do idNfe (Chave de 44 dígitos)
    // O atributo Id vem como "NFe4123...", usamos str_replace para pegar só os números
    $idNfe = str_replace("NFe", "", (string) $infNFe->attributes()->Id);

    // 2. Dados do cabeçalho
    $nfe = [
        "idNfe" => $idNfe,
        "xNome" => (string) $infNFe->emit->xNome,
        "dhEmi" => (string) $infNFe->ide->dhEmi,
        "CNPJ" => (string) $infNFe->dest->CNPJ,
        "xNomeDest" => (string) $infNFe->dest->xNome,
        "products" => [],
    ];

    // 3. Loop nos produtos (tag <det>)
    foreach ($infNFe->det as $item) {
        $prod = $item->prod;

        $icmsNode = null;
        if (isset($item->imposto->ICMS)) {
            $icmsChildren = $item->imposto->ICMS->children();
            foreach ($icmsChildren as $child) {
                $icmsNode = $child;
                break;
            }
        }

        $pisNode = null;
        if (isset($item->imposto->PIS)) {
            $pisChildren = $item->imposto->PIS->children();
            foreach ($pisChildren as $child) {
                $pisNode = $child;
                break;
            }
        }

        $cofinsNode = null;
        if (isset($item->imposto->COFINS)) {
            $cofinsChildren = $item->imposto->COFINS->children();
            foreach ($cofinsChildren as $child) {
                $cofinsNode = $child;
                break;
            }
        }

        $quantityCom = (float) str_replace(",", ".", (string) ($prod->qCom ?: 0),);
        $quantityTrib = (float) str_replace(",", ".", (string) ($prod->qTrib ?: 0),);
        $unitCostCom = (float) str_replace(",", ".", (string) ($prod->vUnCom ?: 0),);
        $unitCostTrib = (float) str_replace(",", ".", (string) ($prod->vUnTrib ?: 0),);
        $totalCost = (float) str_replace(",", ".", (string) ($prod->vProd ?: 0),);
        $unit = (string) ($prod->uTrib ?: $prod->uCom);

        $barcode = trim((string) $prod->cEAN);
        if ($barcode === "" || strtoupper($barcode) === "SEM GTIN") {
            $barcode = trim((string) $prod->cBarra);
        }

        if ($barcode === "") {
            $barcode = "SEM GTIN";
        }

        $barcodeTrib = trim((string) $prod->cEANTrib);
        if ($barcodeTrib === "" || strtoupper($barcodeTrib) === "SEM GTIN") {
            $barcodeTrib = trim((string) $prod->cBarraTrib);
        }

        if ($barcodeTrib === "") {
            $barcodeTrib = $barcode;
        }

        $quantityCom = (float) str_replace(",", ".", (string) ($prod->qCom ?: 0),);
        $quantityTrib = (float) str_replace(",", ".", (string) ($prod->qTrib ?: 0),);
        $unitCostCom = (float) str_replace(",", ".", (string) ($prod->vUnCom ?: 0),);
        $unitCostTrib = (float) str_replace(",", ".", (string) ($prod->vUnTrib ?: 0),);

        //Dados fiscais e de tributação são extraídos diretamente do XML
        // 1. Extrai os dados da nota do fornecedor
        $cfopEntrada = (string) $prod->CFOP;
        $cstEntrada =
            $icmsNode && isset($icmsNode->CST) ? (string) $icmsNode->CST : null;
        $csosnEntrada =
            $icmsNode && isset($icmsNode->CSOSN)
                ? (string) $icmsNode->CSOSN
                : null;
        $origem =
            $icmsNode && isset($icmsNode->orig)
                ? (string) $icmsNode->orig
                : "0";

        // 2. Define os valores Padrão
        $cfopSaida = "5102"; // Venda de mercadoria adquirida de terceiros
        $csosnSaida = "102"; // Tributada pelo Simples Nacional

        // 3. Aplica a Regra de Substituição Tributária
        $cstST = ["10", "30", "60", "70"];
        if (
            strpos($cfopEntrada, "54") === 0 || // Começa com 54
            strpos($cfopEntrada, "64") === 0 || // Começa com 64 (Fora do Estado)
            in_array($cstEntrada, $cstST) ||
            in_array($csosnEntrada, ["500", "201"])
        ) {
            $cfopSaida = "5405"; // Venda sujeita a Substituição Tributária
            $csosnSaida = "500"; // ICMS cobrado anteriormente por ST
        }
        // 4. Aplica a Regra de Isentos / Não Tributados
        elseif (
            in_array($cstEntrada, ["40", "41", "50"]) ||
            in_array($csosnEntrada, ["300", "400"])
        ) {
            $csosnSaida = "400"; // Não tributada
        }

        $nfe["products"][] = [
            "code" => (string) $prod->cProd,
            "barcode" => $barcode,
            "barcodeTrib" => $barcodeTrib,
            "name" => (string) $prod->xProd,
            "unit" => isset($prod->uCom) ? (string) $prod->uCom : null,
            "unitTrib" => isset($prod->uTrib)
                ? (string) $prod->uTrib
                : (isset($prod->uCom)
                    ? (string) $prod->uCom
                    : null),
            "stock" => $quantityCom,
            "stockTrib" => $quantityTrib,
            "costPrice" => number_format($unitCostCom, 2, ".", ""),
            "costPriceTrib" => number_format($unitCostTrib, 2, ".", ""),

            "fiscal" => [
                "ncm" => (string) $prod->NCM,
                "cest" => isset($prod->CEST) ? (string) $prod->CEST : null,
                "cfopSale" => $cfopSaida, // <-- Variável Dinâmica
                "origin" => $origem,
                "csosn" => $csosnSaida,
                "cBenef" => isset($prod->cBenef)
                    ? (string) $prod->cBenef
                    : null,
                "cstPis" =>
                    $pisNode && isset($pisNode->CST)
                        ? (string) $pisNode->CST
                        : null,
                "cstCofins" =>
                    $cofinsNode && isset($cofinsNode->CST)
                        ? (string) $cofinsNode->CST
                        : null,
                "indTot" => isset($prod->indTot) ? (string) $prod->indTot : "1",
            ],

            "taxFuture" => [
                "ibsCbsCst" => isset($item->imposto->IBSCBS->CST)
                    ? (string) $item->imposto->IBSCBS->CST
                    : null,
                "cClassTrib" => isset($item->imposto->IBSCBS->cClassTrib)
                    ? (string) $item->imposto->IBSCBS->cClassTrib
                    : null,
            ],
        ];
    }

    // 4.1 Conversão para JSON e envio da compra + produtos
    $payloadPurchase = json_encode(
        $nfe,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
    );

    $ch = curl_init($urlDestino . "/purchases");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payloadPurchase);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Content-Length: " . strlen($payloadPurchase),
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

    $responsePurchase = curl_exec($ch);
    $httpCodePurchase = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErrorPurchase = curl_error($ch);
    curl_close($ch);

    $resultPurchase = [
        "status_code" => $httpCodePurchase,
        "erro_conexao" => $curlErrorPurchase ?: null,
        "resposta_servidor" =>
            $responsePurchase === false ? null : $responsePurchase,
    ];

    if (
        $responsePurchase === false ||
        $httpCodePurchase < 200 ||
        $httpCodePurchase >= 300
    ) {
        return [
            "purchase_request" => $resultPurchase,
        ];
    }

    return [
        "purchase_request" => $resultPurchase,
    ];
}
