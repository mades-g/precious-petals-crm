import { Outlet } from "react-router"

import Layout from "./layout/layout"

export default function App() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
