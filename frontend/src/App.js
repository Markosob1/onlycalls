import React, { useEffect } from 'react';
import api from './services/api';
import './App.css';

function App() {
  useEffect(() => {
    // Отправляем тестовый GET-запрос к маршруту /api/test
    api.get('/test')
      .then(response => {
        console.log('Test API response:', response.data);
      })
      .catch(error => {
        console.error('Ошибка запроса:', error);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>OnlyCalls Admin Panel</h1>
        <p>Проверьте консоль браузера для просмотра ответа от API</p>
      </header>
    </div>
  );
}

export default App;
