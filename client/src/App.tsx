import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import AdminStock from "./pages/AdminStock";
import AdminCreateOrder from "./pages/AdminCreateOrder";
import AdminOrders from "./pages/AdminOrders";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/categoria/"}>
        <Redirect to="/categoria" />
      </Route>
      <Route path={"/categoria"} component={Home} />
      <Route path={"/catalogo"}>
        <Redirect to="/" />
      </Route>
      <Route path={"/home"} component={Landing} />
      <Route path={"/landing"} component={Landing} />
      <Route path={"/login"} component={Login} />
      <Route path={"/admin/"}>
        <Redirect to="/admin" />
      </Route>
      <Route path={"/admin"} component={Admin} />
      <Route path={"/admin/estoque/"}>
        <Redirect to="/admin/estoque" />
      </Route>
      <Route path={"/admin/estoque"} component={AdminStock} />
      <Route path={"/admin/criar-pedido/"}>
        <Redirect to="/admin/criar-pedido" />
      </Route>
      <Route path={"/admin/criar-pedido"} component={AdminCreateOrder} />
      <Route path={"/admin/pedidos/"}>
        <Redirect to="/admin/pedidos" />
      </Route>
      <Route path={"/admin/pedidos"} component={AdminOrders} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
