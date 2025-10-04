import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import CodeBrowser from './components/CodeBrowser';
import SnippetLibrary from './components/SnippetLibrary';
import ThreadsDashboard from './ThreadsDashboard';

function App() {
  return (
    <Routes>
      {/* Hlavní rozcestník SYSTÉM-73 */}
      <Route path="/" element={<HomePage />} />
      
      {/* Databáze kódů */}
      <Route path="/code-browser" element={<CodeBrowser />} />
      <Route path="/snippet-library" element={<SnippetLibrary />} />
      
      {/* Pokročilý dashboard */}
      <Route path="/dashboard" element={<ThreadsDashboard />} />
      
      {/* Fallback pro neexistující cesty */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

export default App;
