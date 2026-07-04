import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './hooks/useData';
import MobileLayout from './components/layout/MobileLayout';
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
    <DataProvider>
      <BrowserRouter>
        <Routes>
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
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}
