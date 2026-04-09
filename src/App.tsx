import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import Login from '@/pages/auth/Login'
import AuthGuard from '@/components/layout/AuthGuard'
import Layout from '@/components/layout/Layout'

import Dashboard from '@/pages/Dashboard'
import Invoices from '@/pages/Invoices'
import InvoiceForm from '@/pages/InvoiceForm'
import InvoiceDetail from '@/pages/InvoiceDetail'
import Quotes from '@/pages/Quotes'
import QuoteForm from '@/pages/QuoteForm'
import QuoteDetail from '@/pages/QuoteDetail'
import CreditNotes from '@/pages/CreditNotes'
import CreditNoteForm from '@/pages/CreditNoteForm'
import CreditNoteDetail from '@/pages/CreditNoteDetail'
import Customers from '@/pages/Customers'
import Products from '@/pages/Products'
import Categories from '@/pages/Categories'
import Statistics from '@/pages/Statistics'
import SettingsPage from '@/pages/Settings'
import WorkspaceSetup from '@/pages/WorkspaceSetup'
import InviteAccept from '@/pages/InviteAccept'

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/workspace-setup" element={<WorkspaceSetup />} />
          <Route path="/invite/:token" element={<InviteAccept />} />
          <Route
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<InvoiceForm key="new" />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="invoices/:id/edit" element={<InvoiceForm key="edit" />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="quotes/new" element={<QuoteForm key="new" />} />
            <Route path="quotes/:id" element={<QuoteDetail />} />
            <Route path="quotes/:id/edit" element={<QuoteForm key="edit" />} />
            <Route path="credit-notes" element={<CreditNotes />} />
            <Route path="credit-notes/new" element={<CreditNoteForm key="new" />} />
            <Route path="credit-notes/:id" element={<CreditNoteDetail />} />
            <Route path="credit-notes/:id/edit" element={<CreditNoteForm key="edit" />} />
            <Route path="customers" element={<Customers />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  )
}
