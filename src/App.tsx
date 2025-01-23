import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { routes } from './routes';
import './App.css';
import HomeScreen from './components/HomeScreen'

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={route.element}
            />
          ))}
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
