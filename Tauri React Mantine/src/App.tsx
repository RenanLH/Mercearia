import '@mantine/core/styles.css'
import { MantineProvider, createTheme,  AppShell} from "@mantine/core";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./screens/home";
import NovaVenda from "./screens/novaVenda";
import novoProduto from './screens/novoProduto';

function App() {
  const views = [{
    path: '/',
    name: 'Home',
    exact: true,
    component: Home
  },{
    path: 'novaVenda',
    name: 'novaVenda',
    component: NovaVenda
  },{
    path: 'novoProduto',
    name: 'novoProduto',
    component: novoProduto
  }];
  
  const theme = createTheme({
    fontFamily: 'Montserrat, sans-serif',
    defaultRadius: 'md',
    white: 'false',
  });


  return (
    <MantineProvider theme={theme}>
        <AppShell header={{height: 60}} navbar={{width: 300, breakpoint:'sm'}}>
          <Routes>{views.map((view, index)=> <Route key={index} path={view.path} element={<view.component/>}/>)}</Routes>
        </AppShell>
    </MantineProvider>
  );
}

export default App;
