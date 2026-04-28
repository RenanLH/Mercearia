import { Image, Text } from "@mantine/core";
import shoppingCartLogo from "../assets/shopping-cart-svgrepo-com.svg";
import addProductLogo from "../assets/add-to-svgrepo-com.svg";
import historyLogo from "../assets/column-chart-svgrepo-com.svg";

import { NavLink } from "react-router-dom";

function Home() {
return (
    <div className="container">
      <Text size="55px" c={"#FFFF"}>
        Mercearia São Lourenço
      </Text>
      <div className="row">
        <NavLink to="/novaVenda">
          <Image
            h={140}
            w="auto"
            fit="contain"
            style={{ objectFit: "contain" }} // Fallback if the UI library doesn't support 'fit'
            src={shoppingCartLogo}
            className="logo tauri"
            alt="Nova Venda"
          />
        </NavLink>

        <NavLink to="/novoProduto">
          <Image
            h={135}
            w="auto"
            fit="contain"
            style={{ objectFit: "contain" }}
            src={addProductLogo}
            className="logo tauri"
            alt="Novo Produto"
          />
        </NavLink>

        <NavLink to="/historico">
          <Image
            h={140}
            w="auto"
            fit="contain"
            style={{ objectFit: "contain" }}
            src={historyLogo}
            className="logo tauri"
            alt="Histórico"
          />
        </NavLink>
      </div>
    </div>
  );
}
export default Home;
