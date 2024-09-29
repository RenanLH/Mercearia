import { Text } from '@mantine/core'
import shoppingCartLogo from '../assets/shopping-cart-svgrepo-com.svg'
import addProductLogo from '../assets/add-to-svgrepo-com.svg'
import reactLogo from '../assets/react.svg'
import { NavLink } from 'react-router-dom'

function Home() {
  return (
    <div className="container">
    <Text size="22px" c={'#FFFF'}>Mercearia São Lourenço</Text>
    <div className="row">
      <NavLink to='/novaVenda'>
        <img src={shoppingCartLogo} className="logo venda" alt="Vender" />
      </NavLink>  

      <NavLink to='/novoProduto'>
        <img src={addProductLogo} className="logo tauri" alt="Tauri logo" />
      </NavLink>
       
      <a href="https://reactjs.org" target="_blank">
        <img src={reactLogo} className="logo react" alt="React logo" />
      </a>
    </div>

  </div>   
  )
}

export default Home