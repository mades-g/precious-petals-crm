import { createBrowserRouter } from "react-router";

import AuthProvider from "../auth/auth-provider/auth-provider";
import RedirectIfAuthed from "../auth/redirect-if-authed/redirect-if-authed";
import RequireAuth from "../auth/require-auth/require-auth";
import Login from "../pages/login/login";
import Home from "../pages/home/home";
import NewOrder from "../pages/new-order/new-order";
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
          { path: "new-order", element: <NewOrder /> },
        ],
      },
      { path: "*", element: <h1>Not found</h1> },
    ],
  },
]);
