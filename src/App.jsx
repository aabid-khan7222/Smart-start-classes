import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SharedStoreProvider } from './hooks/useSharedStore';
import { AuthProvider } from './hooks/useAuth';
import { DataProvider } from './hooks/useData';
import { AlertProvider } from './context/AlertContext';
import InstituteBranding from './components/InstituteBranding';
import SharedGate from './components/SharedGate';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MobileLayout from './components/layout/MobileLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentForm from './pages/StudentForm';
import StudentProfile from './pages/StudentProfile';
import Fees from './pages/Fees';
import FeePayment from './pages/FeePayment';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <SharedStoreProvider>
      <SharedGate>
        <AuthProvider>
          <DataProvider>
            <AlertProvider>
              <InstituteBranding />
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<MobileLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="students" element={<Students />} />
                      <Route path="students/add" element={<StudentForm />} />
                      <Route path="students/:id" element={<StudentProfile />} />
                      <Route path="students/:id/edit" element={<StudentForm />} />
                      <Route path="fees" element={<Fees />} />
                      <Route path="fees/pay" element={<FeePayment />} />
                      <Route path="attendance" element={<Attendance />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="settings" element={<Settings />} />
                    </Route>
                  </Route>
                </Routes>
              </BrowserRouter>
            </AlertProvider>
          </DataProvider>
        </AuthProvider>
      </SharedGate>
    </SharedStoreProvider>
  );
}
