import React, { useState } from "react";
import {
  Container,
  Stack,
  Title,
  Card,
  Text,
  Group,
  Divider,
  Box,
  Badge,
  Paper,
  SimpleGrid,
  Pagination,
  Drawer,
  ScrollArea,
  ActionIcon,
  Button,
  rem,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import {
  IconCalendar,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconArrowLeft,
} from "@tabler/icons-react";
import axios from "axios";
import { NavLink } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode: number;
}

interface Sale {
  id: string;
  date: string;
  products: Product[];
}

const PAGE_SIZE = 12;

const History: React.FC = () => {
  const [activePage, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sales, setSales] = useState<Sale[]>([]);
  const [date, setSelectedDate] = useState<Date | null>(new Date());
  const [opened, setOpened] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [canPrint, setCanPrint] = useState<boolean>(true);
  const [showTotal, setShowTotal] = useState<boolean>(false);
  const [dailySales, setDailySales] = useState(0);

  const fetchSale = async (currentPage = 1) => {
    const skip = (currentPage - 1) * PAGE_SIZE;

    const response = await axios.get("http://localhost:5000/sales", {
      params: {
        date,
        limit: PAGE_SIZE,
        skip,
      },
    });

    const {
      sales: rawSales,
      numberSales,
      dailyTotal,
    } = response.data as {
      sales: any[];
      numberSales: number;
      dailyTotal: number;
    };

    const parsedSales = rawSales.map((sale) => ({
      ...sale,
      id: sale._id,
      products: sale.products.map((product: any) => {
        const parsed =
          typeof product === "string" ? JSON.parse(product) : product;
        return {
          id: parsed.id || "",
          name: parsed.name,
          price:
            typeof parsed.price === "string"
              ? parseFloat(parsed.price.replace(",", "."))
              : parsed.price,
          quantity: parsed.qtd || 1,
        };
      }),
    }));

    setSales(parsedSales);
    setTotalPages(Math.ceil(numberSales / PAGE_SIZE));
    setDailySales(numberSales);
    setDailyTotal(dailyTotal);
  };

  function numberToMoney(value: number | string) {
    value = String(value).replace(",", ".");
    return String(Number(value).toFixed(2)).replace(".", ",");
  }

  function formatMoney(value: number | string) {
    if (value == 0) {
      return "R$ 0,00";
    }
    const srtValue = numberToMoney(value);
    return `R$ ${srtValue}`;
  }

  const handleConfirmClick = async () => {
    await fetchSale();
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await fetchSale(page);
  };

  const handleViewSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setOpened(true);
  };

  const handleSendToPrinter = async () => {
    if (!activeSale || !canPrint) return;

    setCanPrint(false);
    const url = "http://localhost:5569/print";

    const products = activeSale.products.map((item) => ({
      id: item.id,
      barcode: item.barcode || "",
      name: item.name.slice(0, 20),
      salesName: "",
      qtd: item.quantity,
      price: String(item.price),
    }));

    const sale = {
      productList: products,
      total: String(activeTotal.toFixed(2)).replace(",", "."),
    };

    try {
      await axios.post(url, sale);
    } catch (error) {
      console.error("Erro ao enviar para impressora:", error);
    }

    setTimeout(() => {
      setCanPrint(true);
    }, 2000);
  };

  const activeSale = sales.find((s) => s.id === selectedSaleId);

  let activeTotal = 0;
  if (activeSale) {
    activeSale.products.forEach((item) => {
      activeTotal += item.price * item.quantity;
    });
  }

  return (
    <>
      <div
        style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 100 }}
      >
        <NavLink to="/">
          <ActionIcon size={42} variant="default" aria-label="Voltar">
            <IconArrowLeft style={{ width: rem(24), height: rem(24) }} />
          </ActionIcon>
        </NavLink>
      </div>
      <Container h={"100%"} size="xl" py="md">
        <Stack gap="xl">
          <Group justify="space-between" align="flex-end">
            <Box ml={"10%"}>
              <Title order={1} fw={900} lts="-0.5px">
                Histórico de Vendas
              </Title>
              <Group gap="xs" mt={6}>
                <Text fz={{ base: "13px", sm: "18px" }} fw={700}>
                  {showTotal ? formatMoney(dailyTotal) : "R$ ••••••"}
                </Text>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={() => setShowTotal(!showTotal)}
                >
                  {showTotal ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                </ActionIcon>
              </Group>
              <Text size="md" c="" mt={4}>
                {showTotal ? `${dailySales} vendas` : "•••• vendas"}
              </Text>
            </Box>

            <DateTimePicker
              valueFormat="DD MMM YYYY hh:mm A"
              leftSection={<IconCalendar size={18} stroke={1.5} />}
              label=""
              placeholder="Pick date and time"
              value={date}
              onChange={setSelectedDate}
              w={280}
              submitButtonProps={{
                onClick: handleConfirmClick,
                "aria-label": "Confirm date and time",
              }}
              clearable
            />
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {sales.map((sale) => {
              let totalAmount = 0;
              let totalUnits = 0;

              sale.products.forEach((item) => {
                totalAmount += item.price * item.quantity;
                totalUnits += item.quantity;
              });

              return (
                <Card
                  key={sale.id}
                  withBorder
                  padding="md"
                  radius="md"
                  shadow="sm"
                  onClick={() => handleViewSale(sale.id)}
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    height: "100%",
                  }}
                >
                  <Stack gap="xs" h="100%" justify="space-between">
                    <Box>
                      <Text size="md" fw={600} c="gray">
                        {new Date(sale.date).toLocaleDateString("pt-BR", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        às{" "}
                        {new Date(sale.date).toLocaleTimeString("pt-BR", {
                          timeStyle: "short",
                        })}
                      </Text>
                    </Box>

                    <Stack
                      gap={3}
                      style={{
                        borderTop: "1px solid #e0e0e0",
                        borderBottom: "1px solid #e0e0e0",
                        paddingTop: "0.5rem",
                        paddingBottom: "0.5rem",
                      }}
                    >
                      {sale.products.slice(0, 2).map((product, idx) => (
                        <Text key={idx} size="sm" fw={500} truncate>
                          {product.quantity}× {product.name}
                        </Text>
                      ))}
                      {sale.products.length > 2 && (
                        <Text size="xs" c="dimmed" fw={500}>
                          +{sale.products.length - 2} outro
                          {sale.products.length - 2 > 1 ? "s" : ""}
                        </Text>
                      )}
                    </Stack>

                    <Group justify="space-between" align="flex-end">
                      <Text size="lg" fw={800} c="blue">
                        {formatMoney(totalAmount)}
                      </Text>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        radius="xl"
                        size="sm"
                      >
                        <IconChevronRight size={16} stroke={1.5} />
                      </ActionIcon>
                    </Group>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          {totalPages > 1 && (
            <Group justify="center">
              <Pagination
                total={totalPages}
                value={activePage}
                onChange={handlePageChange}
                color="blue"
                radius="md"
                mb={"xl"}
              />
            </Group>
          )}
        </Stack>

        <Drawer
          opened={opened}
          onClose={() => setOpened(false)}
          position="right"
          size="lg"
          title={
            <Group justify="flex-end" mt="md" gap="xl">
              <Title order={3}>Detalhes</Title>

              <Button onClick={handleSendToPrinter} disabled={!canPrint}>
                Imprimir Nota
              </Button>
            </Group>
          }
          scrollAreaComponent={ScrollArea.Autosize}
        >
          {activeSale && (
            <Stack gap="md" pb="xl">
              <Paper withBorder p="md" bg="var(--mantine-color-gray)">
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Text size="sm" c="dimmed">
                      Data e Hora
                    </Text>
                    <Text fw={500}>
                      {new Date(activeSale.date).toLocaleString("pt-BR")}
                    </Text>
                  </Box>
                  <Stack gap={0} align="flex-end">
                    <Text size="xl" fw={800} c="blue">
                      Total: {formatMoney(activeTotal)}
                    </Text>
                  </Stack>
                </Group>
              </Paper>

              <Divider my="sm" />

              {activeSale.products.map((item, index) => {
                const lineTotal = item.price * item.quantity;

                return (
                  <Paper withBorder p="sm" key={`${item.id}-${index}`}>
                    <Group
                      justify="space-between"
                      wrap="nowrap"
                      align="flex-start"
                    >
                      <Box style={{ flex: 1 }}>
                        <Group gap="xs" mb={4}>
                          <Badge
                            variant="filled"
                            color="gray"
                            size="sm"
                            radius="sm"
                          >
                            {item.quantity}x
                          </Badge>

                          <Text size="md" fw={600}>
                            {item.name.slice(0, 20)}
                          </Text>
                        </Group>
                      </Box>

                      <Stack gap={0} align="flex-end">
                        <Text size="lg" ff="monospace" fw={700}>
                          {formatMoney(lineTotal)}
                        </Text>
                        {item.quantity > 1 && (
                          <Text size="sm" c="dimmed">
                            {formatMoney(item.price)} / un
                          </Text>
                        )}
                      </Stack>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Drawer>
      </Container>
    </>
  );
};

export default History;
