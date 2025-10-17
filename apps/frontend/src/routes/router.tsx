
import { createBrowserRouter } from "react-router"

import AuthProvider from "../auth/auth-provider/auth-provider"
import RedirectIfAuthed from "../auth/redirect-if-authed/redirect-if-authed"
import RequireAuth from "../auth/require-auth/require-auth"
import Login from "../pages/login/login"
import App from "../app"

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
          { index: true, element: <p>Home page</p> },
          { path: "costumers", element: <p>Costumers</p> },
        ],
      },
      { path: "*", element: <h1>Not found</h1> },
    ],
  },
])
