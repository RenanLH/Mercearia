import { useEffect, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Container,
  Group,
  Pagination,
  rem,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { NavLink } from "react-router-dom";
import axios from "axios";

type RegisteredProduct = {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  conversionFactor: number;
  bought?: number;
  sold?: number;
  barcode: string;
  barcodeTrib: string;
  unit: string;
  unitTrib: string;
  costPrice: number;
  costPriceTrib: number;
  salePrice: number;
  createdAt: string;
};

type RegisteredProductsResponse = {
  products: RegisteredProduct[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

type MovementTotalsResponse = {
  totals: Record<string, { bought: number; sold: number }>;
};

const PAGE_SIZE = 20;

function formatMoney(value: number) {
  return `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;
}

function RegisteredProducts() {
  const [products, setProducts] = useState<RegisteredProduct[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [activePage, setActivePage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpdate = async() => { 
    try {
      setError("");
      setLoading(true);
      setProducts([]);
      const res = await axios.post(
        "http://localhost:8000/nfe-entrada",
      );
      if (res.status === 200) {
        setError("Registered products updated successfully.");
        setTimeout(() => fetchProducts(1), 1000);

        
      } else {
        setError("Failed to update registered products.");
      }
    }catch (err: any) {
      setError(
        err?.response?.data ||
          err?.message ||
          "Error:Failed to update registered products",
      );
    }
  }

  const fetchProducts = async (
    page: number,
    params?: { search?: string; sortBy?: string; sortOrder?: string },
  ) => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get<RegisteredProductsResponse>(
        "http://localhost:5000/registered-products",
        {
          params: {
            page,
            limit: PAGE_SIZE,
            search: params?.search ?? search,
            sortBy: params?.sortBy ?? sortBy,
            sortOrder: params?.sortOrder ?? sortOrder,
          },
        },
      );

      const products = response.data.products;

      if (Array.isArray(products)) {
        const totalsResponse = await axios.post<MovementTotalsResponse>(
          "http://localhost:5000/registered-products/movement-totals",
          {
            productIds: products.map((product) => product._id),
          },
        );

        setProducts(
          products.map((product) => ({
            ...product,
            bought: totalsResponse.data.totals[product._id]?.bought || 0,
            sold: totalsResponse.data.totals[product._id]?.sold || 0,
          })),
        );
      } else {
        setProducts(products);
      }

      setTotalPages(Math.max(response.data.pagination.totalPages || 1, 1));
      setActivePage(response.data.pagination.currentPage || 1);
    } catch (fetchError: any) {
      setError(
        fetchError?.response?.data ||
          fetchError?.message ||
          "Failed to fetch registered products",
      );
      setProducts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  function getStock(product: RegisteredProduct) {
    if (product.barcode !== product.barcodeTrib) {
      if (product.unitTrib.includes("KG")) {
        return (product.bought)
      }
      return product.stock; // If the barcodes are different, return the stock as is (Case when the product is bought in a box and sold in units)
    }
    
    if (product.bought !== undefined && product.sold !== undefined) {
      return (product.bought || product.stock) - product.sold; // If bought is zero but it has stock, use stock as the bought value (Case when the product was registered as a single unit)
    }
    return product.stock;
  }

  useEffect(() => {
    fetchProducts(1, { search, sortBy, sortOrder });
  }, [search, sortBy, sortOrder]);

  return (
    <>
      <div style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 100 }}>
        <NavLink to="/">
          <ActionIcon size={42} variant="default" aria-label="Back">
            <IconArrowLeft style={{ width: rem(24), height: rem(24) }} />
          </ActionIcon>
        </NavLink>
      </div>

      <Container h={"100%"} size="xl" py="md">
        <Stack gap="md">
          <Box ml={"10%"}>
            <Title order={1} fw={900} lts="-0.5px">
              Registered Products
            </Title>
          </Box>

          <Group align="end" gap="sm">
            <TextInput
              style={{ flex: 1 }}
              label="Search"
              placeholder="Name or barcode"
              value={searchInput}
              onChange={(event) => setSearchInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setSearch(searchInput.trim());
                }
              }}
            />

            <Select
              label="Sort by"
              value={sortBy}
              onChange={(value) => setSortBy(value || "createdAt")}
              data={[
                { value: "updatedAt", label: "Last Updated"},
                { value: "name", label: "Name" },
                { value: "createdAt", label: "SKU" },
                { value: "stock", label: "Stock" },
                { value: "salePrice", label: "Sale price" },
              ]}
              w={180}
            />

            <Select
              label="Order"
              value={sortOrder}
              onChange={(value) => setSortOrder(value || "desc")}
              data={[
                { value: "desc", label: "\u2193" },
                { value: "asc", label: "\u2191" },
              ]}
              w={160}
            />

            <Button
              onClick={() => {
                setSearch(searchInput.trim());
              }}
            >
              Search
            </Button>

            <Button
              onClick={() => {
                handleUpdate();
              }}
            >
              Update
            </Button>
          </Group>

          {error ? <Text c="red">{error}</Text> : null}

          <Table.ScrollContainer minWidth={1250}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>SKU</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Stock</Table.Th>
                  <Table.Th>Factor</Table.Th>
                  <Table.Th>Bought</Table.Th>
                  <Table.Th>Sold</Table.Th>
                  <Table.Th>Difference</Table.Th>
                  <Table.Th>Barcode</Table.Th>
                  <Table.Th>Barcode Trib</Table.Th>
                  <Table.Th>Unit</Table.Th>
                  <Table.Th>Unit Trib</Table.Th>
                  <Table.Th>Cost Price</Table.Th>
                  <Table.Th>Cost Price Trib</Table.Th>
                  <Table.Th>Sale Price</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.map((product) => (
                  
                  <Table.Tr key={product._id}>
                    <Table.Td>{product.sku}</Table.Td>
                    <Table.Td>{product.name.slice(0,30)}</Table.Td>
                    <Table.Td>{product.stock}</Table.Td>
                    <Table.Td>{product.conversionFactor}</Table.Td>
                    <Table.Td>{Number(product.bought?.toFixed(4)) || product.stock || 0}</Table.Td>
                    <Table.Td>{product.sold || 0}</Table.Td>
                    <Table.Td>{getStock(product) || 0}</Table.Td>
                    <Table.Td>{product.barcode}</Table.Td>
                    <Table.Td>{product.barcodeTrib}</Table.Td>
                    <Table.Td>{product.unit}</Table.Td>
                    <Table.Td>{product.unitTrib}</Table.Td>
                    <Table.Td>{formatMoney(product.costPrice)}</Table.Td>
                    <Table.Td>{formatMoney(product.costPriceTrib)}</Table.Td>
                    <Table.Td>{formatMoney(product.salePrice)}</Table.Td>
                  </Table.Tr>
                ))}

                {!loading && products.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={11}>
                      <Text ta="center" c="dimmed">
                        No products found.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : null}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          <Group justify="space-between">
            <Text c="dimmed">{loading ? "Loading..." : `Page ${activePage} of ${totalPages}`}</Text>
            <Pagination
              value={activePage}
              onChange={(page) => fetchProducts(page)}
              total={totalPages}
            />
          </Group>
        </Stack>
      </Container>
    </>
  );
}

export default RegisteredProducts;
