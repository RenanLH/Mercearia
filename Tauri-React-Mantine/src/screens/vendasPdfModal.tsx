import {
  Badge,
  Box,
  Divider,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { formatMoney, paymentCodeToLabel } from "./vendasHelpers";
import type { PdfExtractedSale } from "./vendasTypes";
import { useState } from "react";

interface PdfExtractedSalesModalProps {
  opened: boolean;
  onClose: () => void;
  pdfExtractedSales: PdfExtractedSale[];
}


const PdfSaleList = ({
  emptyMessage,
  matched,
  sales,
}: {
  emptyMessage: string;
  matched: boolean;
  sales: PdfExtractedSale[];
}) => {
  if (sales.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {emptyMessage}
      </Text>
    );
  }

  return sales.map((pdfSale) => (
    <Paper key={pdfSale.id} withBorder p="sm">
      <Group justify="space-between" gap="sm">
        <Box>
          <Text size="sm" fw={600}>
            {pdfSale.dateTime}
          </Text>
          <Text size="xs" c="dimmed">
            {paymentCodeToLabel(pdfSale.paymentCode)}
            {pdfSale.matchedSaleId ? ` - Venda #${pdfSale.matchedSaleId}` : ""}
          </Text>
        </Box>
        <Badge color={matched ? "green" : "gray"} variant="light">
          {formatMoney(pdfSale.amount)}
        </Badge>
      </Group>
    </Paper>
  ));
};

export const PdfExtractedSalesModal = ({
  opened,
  onClose,
  pdfExtractedSales,
}: PdfExtractedSalesModalProps) => {
  const foundPdfSales = pdfExtractedSales.filter((pdfSale) => pdfSale.isFound);
  const notFoundPdfSales = pdfExtractedSales.filter(
    (pdfSale) => !pdfSale.isFound,
  );
  const [showFound, setShowFound] = useState(false);
  const [showMissing, setShowMissing] = useState(true);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Dados extraídos do PDF"
      size="lg"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        <Group gap="xs">
          <Badge color="green" variant="light">
            {foundPdfSales.length} encontradas
          </Badge>
          <Badge color="gray" variant="light">
            {notFoundPdfSales.length} não encontradas
          </Badge>
        </Group>

        {pdfExtractedSales.length === 0 ? (
          <Text size="sm" c="dimmed">
            Nenhuma venda extraída para o dia selecionado.
          </Text>
        ) : (
          <>
            <Stack gap="xs">
              <Text size="sm" fw={700} onClick={(_event) => setShowFound((prev) => !prev)}>
                Encontradas nas vendas
                </Text>
                {showFound &&
                  (<PdfSaleList
                  emptyMessage="Nenhuma venda encontrada nas páginas carregadas."
                  matched
                  sales={foundPdfSales}
                />)}
              
            </Stack>

            <Divider />

            <Stack gap="xs">
              <Text size="sm" fw={700} onClick={(_event) => setShowMissing((prev) => !prev)}>
                Não encontradas
                </Text>
                {showMissing && (<PdfSaleList
                  emptyMessage="Todas as vendas extraídas foram encontradas."
                  matched={false}
                  sales={notFoundPdfSales}
                />)}
              
            </Stack>
          </>
        )}
      </Stack>
    </Modal>
  );
};
