import 'bootstrap/dist/css/bootstrap.min.css'
import "./globals.css";
import { AuthProvider } from './context/AuthContext';

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
    <html lang="en">
      <body>
        {children}
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossOrigin="anonymous"></script>
      </body>
    </html>
    </AuthProvider>
  );
}
