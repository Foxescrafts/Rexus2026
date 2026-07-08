// Создание разработчика для ID 694644988
const { query } = require('./filedb.js');
const path = require('path');
const fs = require('fs');
const util = require('util');
const databaseQuery = util.promisify(query);

async function createDeveloper() {
  console.log('👨‍💻 СОЗДАНИЕ РАЗРАБОТЧИКА');
  
  try {
    const developerId = 694644988;
    const filePath = path.join(__dirname, 'data', 'sysadmins', `${developerId}.json`);
    
    // 1. Проверяем текущее состояние
    console.log('\n=== ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ ===');
    if (fs.existsSync(filePath)) {
      const currentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log('Файл уже существует:', currentData);
      
      // Если есть файл, удаляем его для чистой установки
      fs.unlinkSync(filePath);
      console.log('Старый файл удален');
    } else {
      console.log('Файл не существует, создаем новый');
    }
    
    // 2. Создаем новую запись с правами разработчика
    console.log('\n=== СОЗДАНИЕ РАЗРАБОТЧИКА ===');
    const insertResult = await databaseQuery(
      'INSERT INTO sysadmins (userid, access) VALUES (?, ?)', 
      [developerId, 5]
    );
    console.log('INSERT результат:', insertResult);
    
    // 3. Проверяем что файл создан правильно
    console.log('\n=== ПРОВЕРКА СОЗДАНИЯ ===');
    if (fs.existsSync(filePath)) {
      const newData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log('Новый файл создан:', newData);
      console.log('Права разработчика (access: 5):', newData.access === 5 ? '✅' : '❌');
    } else {
      console.log('❌ Файл НЕ создан');
    }
    
    // 4. Проверяем через SELECT
    console.log('\n=== ПРОВЕРКА ЧЕРЕЗ SELECT ===');
    const selectResult = await databaseQuery('SELECT * FROM sysadmins WHERE userid = ?', [developerId]);
    console.log('SELECT результат:', selectResult);
    
    // 5. Проверяем в общем списке админов
    console.log('\n=== ОБЩИЙ СПИСОК АДМИНИСТРАТОРОВ ===');
    const allAdmins = await databaseQuery('SELECT userid, access FROM sysadmins ORDER BY access DESC', []);
    console.log('Все администраторы:');
    allAdmins.forEach(admin => {
      const accessName = getAccessName(admin.access);
      console.log(`  - ID: ${admin.userid}, доступ: ${admin.access} (${accessName})`);
    });
    
    console.log('\n🎉 РАЗРАБОТЧИК УСПЕШНО СОЗДАН!');
    console.log(`✅ ID: ${developerId}`);
    console.log('✅ Права: Создатель (access: 5)');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Stack:', error.stack);
  }
}

function getAccessName(access) {
  switch(access) {
    case 5: return 'Создатель';
    case 4: return 'Основатель';
    case 3: return 'Заместитель основателя';
    case 2: return 'Модератор';
    case 1: return 'Агент поддержки';
    default: return 'Неизвестно';
  }
}

createDeveloper().catch(console.error);
