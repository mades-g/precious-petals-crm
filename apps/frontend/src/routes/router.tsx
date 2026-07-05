import { createBrowserRouter } from "react-router";

import Order from "@/pages/order/order";
import InvoicePreview from "@/pages/invoice-preview/invoice-preview";

import AuthProvider from "../auth/auth-provider/auth-provider";
import RedirectIfAuthed from "../auth/redirect-if-authed/redirect-if-authed";
import RequireAdmin from "../auth/require-admin/require-admin";
import RequireAuth from "../auth/require-auth/require-auth";
import Login from "../pages/login/login";
import Home from "../pages/home/home";
import MemberPasswords from "../pages/admin/member-passwords";
import App from "../app";

export const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <App />
      </AuthProvider>
    ),
    children: [
      // public routes
      {
        path: "/login",
        element: (
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        ),
      },

      // protected routes
      {
        element: <RequireAuth />,
        children: [
          { index: true, element: <Home /> },
          { path: "/order/:orderId", element: <Order /> },
          { path: "/invoice-preview", element: <InvoicePreview /> },
          {
            element: <RequireAdmin />,
            children: [
              {
                path: "/admin/member-passwords",
                element: <MemberPasswords />,
              },
            ],
          },
        ],
      },
      { path: "*", element: <h1>Not found</h1> },
    ],
  },
]);
