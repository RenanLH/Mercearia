import React, { useState } from 'react';
import {
  Container, Stack, Title, Card, Text, Group, Divider,
  Box, Badge, Select, Paper, SimpleGrid, Pagination,
  Drawer, ScrollArea, ActionIcon,
  Button
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconCalendar, IconReplace, IconChevronRight, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import axios from 'axios';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================
interface Alternative {
  id: string;
  name: string;
  price: number;
  stock: number;
  isOriginalItem?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isRegistered: boolean;
  stockStatus: 'green' | 'yellow' | 'red' | 'resolved';
  stock?: number;
  alternatives: Alternative[];
  originalName: string;
  originalPrice: number;
  isOriginalItem?: boolean;
}

interface Sale {
  id: string;
  date: string;
  products: Product[];
}

// ==========================================
// 3. MAIN DASHBOARD COMPONENT
// ==========================================
const PAGE_SIZE = 12; // Try 6, 9, or 12 here

const Vendas: React.FC = () => {
  const [activePage, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sales, setSales] = useState<Sale[]>([]);
  const [date, setSelectedDate] = useState<Date | null>(new Date());
  const [opened, setOpened] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [dailyTotal, setDailyTotal] = useState(0);

  const fetchSale = async(currentPage = 1)=>{
    const skip = (currentPage - 1) * PAGE_SIZE;

    const response = await axios.get('http://localhost:5000/sales/registered', {
      params: {
        date,
        limit: PAGE_SIZE,
        skip
      }
    });

    const { sales, numberSales, dailyTotal } = response.data as {
      sales: Sale[];
      numberSales: number;
      dailyTotal: number;
    };

    setSales(sales);
    setTotalPages(Math.ceil(numberSales / PAGE_SIZE));
    setDailyTotal(dailyTotal);

  }

  function numberToMoney(value: number | string) {
    value = String(value).replace(",", ".");
    return String(Number(value).toFixed(2)).replace(".", ",");
  }

  function formatMoney(value: number | string) {
    if (value == 0) {
      return "R$ 0,0";
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

  const handleSendSale = async () => {
    if (!activeSale) return;

    const payload = {
      ...activeSale,
      total: activeAdjustedTotal,
      products: activeSale.products.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))
    };

    await axios.post("http://localhost:5000/sales/registered", payload);
  };

  const handleReplaceItem = (saleId: string, productIndex: number, selectedAltId: string) => {
    setSales(prevSales => prevSales.map(sale => {
      if (sale.id !== saleId) return sale;

      const updatedProducts = [...sale.products];
      const product = updatedProducts[productIndex];
      const altIndex = product.alternatives.findIndex((a) => a.id === selectedAltId);

      if (altIndex === -1) return sale;
      const selectedAlt = product.alternatives[altIndex];

      const trueOriginalName = product.originalName || product.name;
      const trueOriginalPrice = product.originalPrice || product.price;

      const currentAsAlternative: Alternative = {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock || 0,
        isOriginalItem: product.stockStatus === 'red' || product.isOriginalItem
      };

      const newAlternatives = [...product.alternatives];
      newAlternatives.splice(altIndex, 1);
      newAlternatives.push(currentAsAlternative);

      updatedProducts[productIndex] = {
        ...product,
        id: selectedAlt.id,
        name: selectedAlt.name,
        price: selectedAlt.price,
        stock: selectedAlt.stock,
        stockStatus: selectedAlt.isOriginalItem ? 'red' : 'resolved',
        isRegistered: !selectedAlt.isOriginalItem,
        isOriginalItem: selectedAlt.isOriginalItem,
        alternatives: newAlternatives,
        originalName: trueOriginalName,
        originalPrice: trueOriginalPrice,
      };

      return { ...sale, products: updatedProducts };
    }));
  };

  const getStatusColor = (status: string) => {
    if (status === 'red') return 'red';
    if (status === 'yellow') return 'orange';
    if (status === 'green') return 'teal';
    if (status === 'resolved') return 'blue';
    return 'gray';
  };

  const handleViewSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setOpened(true);
  };

  const activeSale = sales.find(s => s.id === selectedSaleId);

  let activeOriginalTotal = 0;
  let activeAdjustedTotal = 0;
  if (activeSale) {
    activeSale.products.forEach(item => {
      const basePrice = item.originalPrice || item.price;
      activeOriginalTotal += basePrice * item.quantity;
      if (item.stockStatus !== 'red') activeAdjustedTotal += item.price * item.quantity;
    });
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <Box>
            <Title order={1} fw={900} lts="-0.5px">Vendas</Title>
            <Text fw={700} mt={6}>
              Total: {formatMoney(dailyTotal)}
            </Text>
          </Box>

          <DateTimePicker
            valueFormat="DD MMM YYYY hh:mm A"
            leftSection={<IconCalendar size={18} stroke={1.5} />}
            label=""
            placeholder="Pick date and time"
            value={date}
            onChange={setSelectedDate} w={280}
            submitButtonProps={{
              onClick: handleConfirmClick,
              'aria-label': 'Confirm date and time', 
            }}
            clearable />

        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {sales.map((sale) => {
            let originalTotal = 0;
            let adjustedTotal = 0;
            let actionRequiredCount = 0;
            let resolvedCount = 0;
            let totalUnits = 0;

            sale.products.forEach((item) => {
              const basePrice = item.originalPrice || item.price;
              originalTotal += basePrice * item.quantity;
              totalUnits += item.quantity;

              if (item.stockStatus !== 'red') adjustedTotal += item.price * item.quantity;
              if (item.stockStatus === 'red') actionRequiredCount += 1;
              if (item.stockStatus === 'resolved') resolvedCount += 1;
            });

            return (
              <Card
                key={sale.id}
                withBorder padding="lg" radius="md" shadow="sm" component="button"
                onClick={() => handleViewSale(sale.id)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
              >
                <Group justify="space-between" mb="xs">
                  <Badge variant="light" size="md" radius="sm" color={actionRequiredCount > 0 ? 'red' : 'blue'}>
                    #{sale.id}
                  </Badge>
                  <Text size="xs" fw={500} c="dimmed">
                    {new Date(sale.date).toLocaleTimeString([], { timeStyle: 'short' })}
                  </Text>
                </Group>

                <Stack gap={4} mt="md" mb="xl">
                  <Text size="sm" c="dimmed">Produtos: {sale.products.length} ({totalUnits} unidades)</Text>
                  {actionRequiredCount > 0 && (
                    <Group gap="xs">
                      <IconAlertCircle size={14} color="var(--mantine-color-red-6)" />
                      <Text size="sm" c="red" fw={500}>{actionRequiredCount} {actionRequiredCount > 1 ? "Erros" : "Erro"}</Text>
                    </Group>
                  )}
                  {resolvedCount > 0 && actionRequiredCount === 0 && (
                    <Group gap="xs">
                      <IconCheck size={14} color="var(--mantine-color-blue-6)" />
                      <Text size="sm" c="blue" fw={500}>Problema resolvido</Text>
                    </Group>
                  )}
                </Stack>

                <Group justify="space-between" align="flex-end" mt="auto">
                  <Stack gap={0} align="flex-start">
                    {(actionRequiredCount > 0 || resolvedCount > 0) && (
                      <Text size="xs" td="line-through" c="dimmed">Original: R${originalTotal.toFixed(2)}</Text>
                    )}
                    <Text size="20px" fw={800} c="blue">{formatMoney(adjustedTotal)}</Text>
                  </Stack>
                  <ActionIcon variant="subtle" color="gray" radius="xl">
                    <IconChevronRight size={20} stroke={1.5} />
                  </ActionIcon>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>

        {totalPages > 1 && (
          <Group justify="center" mt="xl">
            <Pagination
              total={totalPages}
              value={activePage}
              onChange={handlePageChange}
              color="blue"
              radius="md"
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
          <Group gap="sm">
            <Title order={3}>Detalhes</Title>
            <Badge size="lg" radius="sm">{activeSale?.id}</Badge>
          </Group>
        }
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {activeSale && (
          <Stack gap="md" pb="xl">

            <Paper withBorder p="md" bg="var(--mantine-color-gray-0)">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="sm" c="dimmed">Data e Hora</Text>
                  <Text fw={500}>{new Date(activeSale.date).toLocaleString("br")}</Text>
                </Box>
                <Stack gap={0} align="flex-end">
                  {activeOriginalTotal !== activeAdjustedTotal && (
                    <Text size="sm" td="line-through" c="dimmed">Orig: ${activeOriginalTotal.toFixed(2)}</Text>
                  )}
                  <Text size="xl" fw={800} c="blue">Total: {formatMoney(activeAdjustedTotal)}</Text>
                </Stack>
              </Group>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button onClick={handleSendSale}>
                Enviar
              </Button>
            </Group>

            <Divider my="sm" />

            {activeSale.products.map((item, index) => {
              const lineTotal = item.price * item.quantity;

              const selectOptions = [
                {
                  value: item.id,
                  label: `${item.name} (${formatMoney(item.price)}/un)`
                },
                ...(item.alternatives?.map((alt) => ({
                  value: alt.id,
                  label: `${alt.name} (${formatMoney(alt.price)}/un) — ${alt.isOriginalItem ? 'Voltar ao Original' : `Estoque: ${alt.stock}`}`
                })) || [])
              ];

              let bg = 'transparent';
              if (item.stockStatus === 'red') bg = 'var(--mantine-color-red-light)';
              if (item.stockStatus === 'resolved') bg = 'var(--mantine-color-blue-light)';

              return (
                <Paper withBorder p="sm" key={`${item.id}-${index}`} bg={bg}>
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Box style={{ flex: 1 }}>
                      <Group gap="xs" mb={4}>
                        <Badge variant="filled" color="gray" size="sm" radius="sm">
                          {item.quantity}x
                        </Badge>

                        <Text
                          size="sm"
                          fw={600}
                          td={item.stockStatus === 'red' ? 'line-through' : 'none'}
                          c={getStatusColor(item.stockStatus)}
                        >
                          {item.name}
                        </Text>

                        {item.stockStatus === 'red' && <Text size="xs" c="red" fw={500}>(Sem registro)</Text>}
                        {item.stockStatus === 'resolved' && <Text size="xs" c="blue" fw={500}>(Replaced)</Text>}

                        {item.isRegistered && (
                          <Badge size="xs" variant="light" color={getStatusColor(item.stockStatus)}>
                            Estoque: {item.stock}
                          </Badge>
                        )}
                      </Group>

                      {item.stockStatus === 'resolved' && (
                        <Text size="xs" c="dimmed" mt={4} mb={8}>
                          Original: {item.originalName} ({formatMoney(item.originalPrice)}/un)
                        </Text>
                      )}

                      {(item.stockStatus === 'red' || item.stockStatus === 'resolved') && selectOptions.length > 1 && (
                        <Select
                          size="xs"
                          value={item.id}
                          data={selectOptions}
                          leftSection={<IconReplace size={14} />}
                          mt={8}
                          searchable
                          allowDeselect={false}
                          onChange={(val) => {
                            if (val && val !== item.id) handleReplaceItem(activeSale.id, index, val);
                          }}
                        />
                      )}
                    </Box>

                    <Stack gap={0} align="flex-end">
                      <Text ff="monospace" fw={700}>{formatMoney(lineTotal)}</Text>
                      {item.quantity > 1 && (
                        <Text size="xs" c="dimmed">{formatMoney(item.price)} / un</Text>
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
  );
};

export default Vendas;