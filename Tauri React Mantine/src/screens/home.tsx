import { Image, Text } from '@mantine/core'
import shoppingCartLogo from '../assets/shopping-cart-svgrepo-com.svg'
import addProductLogo from '../assets/add-to-svgrepo-com.svg'
import historyLogo from '../assets/column-chart-svgrepo-com.svg'

import { NavLink } from 'react-router-dom'

function Home() {
  return (
    <div className="container">
    <Text size="55px" c={'#FFFF'}>Mercearia São Lourenço</Text>
    <div className="row">

      <NavLink to='/novaVenda'>
        <Image h={160} src={shoppingCartLogo} className="logo tauri" alt="Tauri logo" />
      </NavLink>

      <NavLink to='/novoProduto'>
        <Image h={145} src={addProductLogo} className="logo tauri" alt="Tauri logo" />
      </NavLink>
       
      <NavLink to='/historico'>
        <Image h={145} src={historyLogo} className="logo tauri" alt="Tauri logo" />
      </NavLink>
    </div>

  </div>   
  )
}

export default Home