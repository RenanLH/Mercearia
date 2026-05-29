import { ActionIcon, Badge, Card, Group, Stack, Text } from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  formatMoney,
  getAdjustedSaleTotal,
  getSaleStatusCounters,
  paymentCodeToLabel,
} from "./vendasHelpers";
import type { Sale } from "./vendasTypes";

interface VendasSaleCardProps {
  sale: Sale;
  onViewSale: (saleId: string) => void;
}

export const VendasSaleCard = ({ sale, onViewSale }: VendasSaleCardProps) => {
  const originalTotal = sale.originalTotal;
  const adjustedTotal = getAdjustedSaleTotal(sale);
  const { actionRequiredCount, resolvedCount } = getSaleStatusCounters(sale);
  const isMatchedByPdf = sale.isPdfMatched;

  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      shadow="sm"
      component="button"
      onClick={() => onViewSale(sale.id)}
      style={{
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        boxShadow: isMatchedByPdf
          ? "0 0 0 2px var(--mantine-color-violet-5)"
          : undefined,
        backgroundColor: isMatchedByPdf
          ? "var(--mantine-color-violet-light)"
          : undefined,
      }}
    >
      <Group justify="space-between" mb="xs">
        <Badge
          variant="light"
          size="md"
          radius="sm"
          color={
            sale.isRegistered
              ? "green"
              : actionRequiredCount > 0
                ? "red"
                : "blue"
          }
        >
          {sale.isRegistered ? `NFCe #${sale.registeredSaleInfo?.saleId}` : `#${sale.id}`}
        </Badge>
        <Text size="xs" fw={500} c="dimmed">
          {new Date(sale.date).toLocaleTimeString("br", {
            timeStyle: "short",
          })}
        </Text>
      </Group>
      {isMatchedByPdf && (
        <Stack gap={2} mb={6}>
          <Text size="xs" fw={700} c="violet">
            Correspondente no PDF
          </Text>
          <Text size="xs" c="violet">
            {sale.pdfMatchedLine?.dateTime} -{" "}
            {formatMoney(sale.pdfMatchedLine?.amount || 0)} -{" "}
            {paymentCodeToLabel(sale.pdfMatchedLine?.paymentMethod || "01")}
          </Text>
        </Stack>
      )}

      <Stack gap={4} mt="md" mb="xl">
        {sale.isRegistered && (
          <Group gap="xs">
            <IconCheck size={14} color="var(--mantine-color-green-6)" />
            <Text size="sm" c="green" fw={500}>
              Registrada em uma NFCe
            </Text>
          </Group>
        )}
        {actionRequiredCount > 0 && !sale.isRegistered && (
          <Group gap="xs">
            <IconAlertCircle size={14} color="var(--mantine-color-red-6)" />
            <Text size="sm" c="red" fw={500}>
              {actionRequiredCount} {actionRequiredCount > 1 ? "Erros" : "Erro"}
            </Text>
          </Group>
        )}
        {resolvedCount > 0 && actionRequiredCount === 0 && !sale.isRegistered && (
          <Group gap="xs">
            <IconCheck size={14} color="var(--mantine-color-blue-6)" />
            <Text size="sm" c="blue" fw={500}>
              Problema resolvido
            </Text>
          </Group>
        )}
      </Stack>

      <Group justify="space-between" align="flex-end" mt="auto">
        <Stack gap={0} align="flex-start">
          {(actionRequiredCount > 0 || resolvedCount > 0) && (
            <Text size="xs" c="dimmed">
              Original: R${originalTotal.toFixed(2)}
            </Text>
          )}
          <Text size="20px" fw={800} c="blue">
            {formatMoney(adjustedTotal)}
          </Text>
        </Stack>
        <ActionIcon variant="subtle" color="gray" radius="xl">
          <IconChevronRight size={20} stroke={1.5} />
        </ActionIcon>
      </Group>
    </Card>
  );
};
