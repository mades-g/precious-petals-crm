import { render, screen } from '@testing-library/react'

import Login from './login'

test('renders Sign in text', () => {
  render(<Login />)
  expect(screen.getByTestId('sign-in-card')).toBeInTheDocument()
})
