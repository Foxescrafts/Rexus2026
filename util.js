 
const database = require('./databases.js');

const { API, resolveResource } = require('vk-io')

async function checkUserRole(conferenceId, userId) {
  return new Promise((resolve, reject) => {
    const rolesTableName = `roles_${conferenceId}`;
    const getUserRoleQuery = `
      SELECT role_id
      FROM ${rolesTableName}
      WHERE user_id = ?
    `;
    
    database.query(getUserRoleQuery, [userId], (error, results) => {
      if (error) {
        console.error('Ошибка при получении роли пользователя:', error);
        reject(error);
        return;
      }
      
      if (results && results[0] && results[0].role_id) {
        resolve(results[0].role_id);
      } else {
        resolve(null);  
      }
    });
  });
}

async function getUserIdByUsername(username) {
  const matches = username.match(/^@(\w+)/);
  if (matches && matches[1]) {
    try {
      const users = await vk.api.users.get({ user_ids: matches[1] });
      if (users && users[0] && users[0].id) {
        return users[0].id;
      }
    } catch (error) {
      console.error('Ошибка при получении ID пользователя:', error);
    }
  }
  return null;
}

global.getUserIdByUsername = getUserIdByUsername
async function getUsername(userId) {
  try {
    const user = await vk.api.users.get({ user_ids: [userId] });
    return `${user[0].first_name} ${user[0].last_name}`;
  } catch (error) {
    console.error('Ошибка при получении информации о пользователе:', error);
    return null;
  }
}
global.getUsername = getUsername
async function getUserIdFromInput(input) {
  const numericIdMatch = input.match(/\[id(\d+)\|.*\]/);
  if (numericIdMatch && numericIdMatch[1]) {
    return numericIdMatch[1];
  }
  
  const usernameMatch = input.match(/@?(\w+)/);
  if (usernameMatch && usernameMatch[1]) {
    const user = await vk.api.users.get({ user_ids: usernameMatch[1] });
    if (user && user[0] && user[0].id) {
      return user[0].id;
    }
  }
  
  return null;
}
global.getUserIdFromInput = getUserIdFromInput

async function getAgentInfo(agent) {
  return new Promise((resolve, reject) => {
    const rolesTableName = `tech`;
    const getUserRoleQuery = `
      SELECT *
      FROM ${rolesTableName}
      WHERE user_id = ?
    `;
    
    database.query(getUserRoleQuery, [agent], (error, results) => {
      if (error) {
        console.error('Ошибка при получении роли пользователя:', error);
        reject(error);
        return;
      }
      if (results && results[0] && results[0].dostup) {
        resolve(results[0]);
      } else {
        resolve(null);  
      }
    });
  });
}

async function getlink(userId) {
  try {
    let numericId = userId;
    if (typeof numericId === 'number') {
       
      if (numericId < 0) {
        numericId = Math.abs(numericId);
        
        // 🚀 Проверяем кэш для групп
        const cacheKey = `group_${numericId}`;
        const cachedGroup = cacheManager.getVkUser(cacheKey);
        if (cachedGroup) {
          return cachedGroup;
        }
        
        try {
          const groupInfo = await vk.api.groups.getById({
            group_ids: numericId,
            fields: 'name',  
          });
          const result = `[club${numericId}|${groupInfo.groups[0].name}]`;
          
          // 🚀 Сохраняем в кэш
          cacheManager.setVkUser(cacheKey, result);
          return result;
        } catch (error) {
          console.error('Ошибка при получении информации о сообществе:', error);
          const fallback = `[club${numericId}|Сообщество]`;
          // 🚀 Кэшируем даже ошибочные результаты на короткое время
          cacheManager.setVkUser(cacheKey, fallback);
          return fallback;
        }
      } else {
        // 🚀 Проверяем кэш для пользователей
        const cachedUser = cacheManager.getVkUser(numericId);
        if (cachedUser) {
          return cachedUser;
        }
        
        const user = await vk.api.users.get({ user_ids: [numericId] });
        const userInfo = user[0];
        
        let result;
        // Проверяем статус пользователя
        if (userInfo.deactivated) {
          const statusMap = {
            'deleted': 'УДАЛЁН',
            'banned': 'ЗАБЛОКИРОВАН',
            'suspended': 'ЗАМОРОЖЕН'
          };
          const status = statusMap[userInfo.deactivated] || 'НЕДОСТУПЕН';
          // Для заблокированных пользователей используем HTTP-ссылку
          result = `[https://vk.com/id${numericId}|${userInfo.first_name} ${userInfo.last_name}] (${status})`;
        } else {
          result = `[id${numericId}|${userInfo.first_name} ${userInfo.last_name}]`;
        }
        
        // Сохраняем в кэш
        cacheManager.setVkUser(numericId, result);
        return result;
      }
    } else {
      numericId = await extractNumericId(userId);
      if (numericId) {
         
        if (numericId < 0) {
          numericId = Math.abs(numericId);
          try {
            const groupInfo = await vk.api.groups.getById({
              group_ids: numericId,
              fields: 'name',  
            });
            const result = `[club${numericId}|${groupInfo.groups[0].name}]`;
            
            // Сохраняем в кэш
            cacheManager.setVkUser(`group_${numericId}`, result);
            return result;
          } catch (error) {
            console.error('Ошибка при получении информации о сообществе:', error);
            const fallback = `[club${numericId}|Сообщество]`;
            // Кэшируем даже ошибочные результаты
            cacheManager.setVkUser(`group_${numericId}`, fallback);
            return fallback;
          }
        } else {
          // Проверяем кэш для пользователей
          const cachedUser = cacheManager.getVkUser(numericId);
          if (cachedUser) {
            return cachedUser;
          }
          
          const user = await vk.api.users.get({ user_ids: [numericId] });
          const userInfo = user[0];
          
          let result;
          // Проверяем статус пользователя
          if (userInfo.deactivated) {
            const statusMap = {
              'deleted': 'УДАЛЁН',
              'banned': 'ЗАБЛОКИРОВАН',
              'suspended': 'ЗАМОРОЖЕН'
            };
            const status = statusMap[userInfo.deactivated] || 'НЕДОСТУПЕН';
            // Для заблокированных пользователей используем HTTP-ссылку
            result = `[https://vk.com/id${numericId}|${userInfo.first_name} ${userInfo.last_name}] (${status})`;
          } else {
            result = `[id${numericId}|${userInfo.first_name} ${userInfo.last_name}]`;
          }
          
          // Сохраняем в кэш
          cacheManager.setVkUser(numericId, result);
          return result;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Ошибка при получении информации о пользователе/сообществе:', error);
    // Возвращаем fallback значение в зависимости от типа ID
    if (typeof userId === 'number' && userId < 0) {
      return `[club${Math.abs(userId)}|Сообщество]`;
    } else if (typeof userId === 'number' && userId > 0) {
      return `[https://vk.com/id${userId}|Пользователь] (НЕДОСТУПЕН)`;
    }
    return null;
  }
}

async function getpoolkey(peerId) {
  const showTablesQuery = 'SHOW TABLES';
  const poolTables = await new Promise((resolve, reject) => {
    database.query(showTablesQuery, (error, results) => {
      if (error) {
        console.error('Ошибка при запросе таблиц:', error);
        reject(error);
      } else {
        const tables = results.map(result => result[`Tables_in_conference`]);
        resolve(tables);
      }
    });
  });

  for (const tableName of poolTables) {
    if (tableName.startsWith('pools_')) {
      const selectPoolQuery = `
        SELECT *
        FROM ${tableName}
        WHERE pool_peerIds LIKE ?
      `;

      const selectResults = await new Promise((resolve, reject) => {
        database.query(selectPoolQuery, [`%${peerId}%`], (selectError, selectResults) => {
          if (selectError) {
            console.error(`Ошибка при запросе информации о пулле из таблицы ${tableName}:`, selectError);
            reject(selectError);
          } else {
            resolve(selectResults);
          }
        });
      });

      if (selectResults.length > 0) {
        const pool = selectResults[0];
        const poolKey = pool.pool_key;
        return poolKey;
      }
    }
  }

  return null;  
}


// 🚀 ОПТИМИЗАЦИЯ: Подключаем кэширование
const cacheManager = require('./cache_manager.js');

async function getUserRole(conferenceId, userId) {
  // Сначала проверяем кэш
  const cachedRole = cacheManager.getUserRole(conferenceId, userId);
  if (cachedRole !== null) {
    return cachedRole;
  }
  
  return new Promise((resolve, reject) => {
    const rolesTableName = `roles_${conferenceId}`;
    const getUserRoleQuery = `
      SELECT role_id
      FROM ${rolesTableName}
      WHERE user_id = ?
      LIMIT 1
    `;
    
    database.query(getUserRoleQuery, [userId], (error, results) => {
      if (error) {
        console.error('Ошибка при получении роли пользователя:', error);
        reject(error);
        return;
      }
      
      const role = (results && results[0] && results[0].role_id) ? results[0].role_id : 0;
      
      // Сохраняем в кэш
      cacheManager.setUserRole(conferenceId, userId, role);
      
      resolve(role);
    });
  });
}

async function getUserVip(userId) {
  return new Promise((resolve, reject) => {
    const rolesTableName = `vip_users`;
    const getUserRoleQuery = `
      SELECT *
      FROM ${rolesTableName}
      WHERE user_id = ?
    `;
    
    database.query(getUserRoleQuery, [userId], (error, results) => {
      if (error) {
        console.error('Ошибка при получении роли пользователя:', error);
        reject(error);
        return;
      }
      if (results && results[0] && results[0].vip) {
      console.log(results[0].vip)
        resolve(results[0].vip);
      } else {
        resolve(null);  
      }
    });
  });
}

async function getUserTech(userId) {
  return new Promise((resolve, reject) => {
    const rolesTableName = `agents`;
    const getUserRoleQuery = `
      SELECT *
      FROM ${rolesTableName}
      WHERE user_id = ?
    `;
    
    database.query(getUserRoleQuery, [userId], (error, results) => {
      if (error) {
        console.error('Ошибка при получении роли пользователя:', error);
        reject(error);
        return;
      }
      if (results && results[0] && results[0].agent_access) {
      console.log(results[0].agent_access)
        resolve(results[0].agent_access);
      } else {
        resolve(null);  
      }
    });
  });
}

async function getUserVipStatus(userId) {
  return new Promise((resolve, reject) => {
    const rolesTableName = `vip_users`;
    const getUserRoleQuery = `
      SELECT *
      FROM ${rolesTableName}
      WHERE user_id = ?
    `;
    
    database.query(getUserRoleQuery, [userId], (error, results) => {
      if (error) {
        console.error('Ошибка при получении роли пользователя:', error);
        reject(error);
        return;
      }
      if (results && results[0] && results[0].vip) {
        resolve("(VIP-Пользователь)");
      } else {
        resolve("");  
      }
    });
  });
}

async function checkIfTableExists(tableName) {
  const query = `SHOW TABLES LIKE '${tableName}'`;
  return new Promise((resolve) => {
    database.query(query, (error, results) => {
      if (error) {
        console.error('Ошибка при проверке существования таблицы:', error);
        resolve(false);
      } else {
        resolve(results.length > 0);
      }
    });
  });
}

function getRoleName(roleId) {
  const roles = {
    20: 'Модератор',
    40: 'Администратор',
    60: 'Спец. Администратор',
    80: 'Руководитель',
    100: 'Владелец',
     
  };
  
  return roles[roleId] || 'Пользователь';
}

function getRoleNamezov(roleId) {
  const roles = {
    20: 'Модератором',
    40: 'Администратором',
    60: 'Спец администратором',
    80: 'Руководителем',
    100: 'Владельцем',
     
  };
  
  return roles[roleId] || 'Пользователь';
}

function getDeviceName(platform) {
  switch (platform) {
    case 1:
      return 'Мобильная версия сайта или мобильное приложение';
    case 2:
      return 'Приложение для iPhone';
    case 3:
      return 'Приложение для iPad';
    case 4:
      return 'Приложение для Android';
    case 5:
      return 'Приложение для Windows Phone';
    case 6:
      return 'Приложение для Windows 10';
    case 7:
      return 'Полная версия сайта (ПК)';
  }
}

async function extractNumericId(input) {
console.log(`[extractNumericId DEBUG] Input: ${input}, type: ${typeof input}`);
  
try {
    // Если вход уже число, возвращаем его
    if (typeof input === 'number') {
      console.log(`[extractNumericId DEBUG] Input is number: ${input}`);
      return input;
    }

    if (typeof input !== 'string') {
      console.error('Неверный тип input:', typeof input);
      return null;
    }

    // Проверяем, если строка содержит только цифры
    if (/^\d+$/.test(input)) {
      const numericId = parseInt(input, 10);
      console.log(`[extractNumericId DEBUG] Pure numeric string: ${numericId}`);
      return numericId;
    }

    // Проверяем паттерн [id123|...]
    const idPattern = /\[id(\d+)\|.*\]/;
    const matches = input.match(idPattern);
    
    if (matches && matches.length > 1) {
      const numericId = parseInt(matches[1], 10);
      console.log(`[extractNumericId DEBUG] Found ID pattern: ${numericId}`);
      return numericId;
    }
    
    // Проверяем VK ссылки типа https://vk.com/id123 или https://vk.com/username
    const vkLinkPattern = /(?:https?:\/\/)?(?:vk\.com|m\.vk\.com)\/(id)?(\d+|[a-zA-Z0-9_.]+)/;
    const vkMatches = input.match(vkLinkPattern);
    
    if (vkMatches) {
      const identifier = vkMatches[2];
      console.log(`[extractNumericId DEBUG] Found VK link identifier: ${identifier}`);
      
      // Если это число, возвращаем его
      if (/^\d+$/.test(identifier)) {
        const numericId = parseInt(identifier, 10);
        console.log(`[extractNumericId DEBUG] VK numeric ID: ${numericId}`);
        return numericId;
      }
      
      // Если это имя пользователя, пытаемся разрешить через VK API
      try {
        console.log(`[extractNumericId DEBUG] Trying to resolve username: ${identifier}`);
        const users = await vk.api.users.get({ user_ids: [identifier] });
        if (users && users.length > 0) {
          const numericId = users[0].id;
          console.log(`[extractNumericId DEBUG] Resolved username to ID: ${numericId}`);
          return numericId;
        }
      } catch (vkError) {
        console.error(`[extractNumericId DEBUG] VK API error for username ${identifier}:`, vkError);
      }
    }
    
    // Пытаемся использовать resolveResource как fallback
    try {
      console.log(`[extractNumericId DEBUG] Trying resolveResource as fallback`);
      const api = new API({
        token: 'vk1.a.MdGbjX6_ftQfYpMI-ojMfbVmRsWi6-cmT3yTE7tQWb4l0IMEUZrNp91bCb4VGmqi5ybE1oV1AalS9jhejYm7lFPQYozn-GXaOx7KQKpdsC8z99mCXRSGJM6hG_CM_62O3cVNCbN7mESk6s3GbaNdTzEIQ7NukWdJaqCB8qGou2bt5i2rEw8jAWyPY2U_bUMZ1iun9PyELi1AsgauhOPJ1g'
      });
      const resource = await resolveResource({ api, resource: input });
      if (resource && resource.type === 'user') {
        console.log(`[extractNumericId DEBUG] resolveResource returned ID: ${resource.id}`);
        return resource.id;
      }
    } catch (resolveError) {
      console.error(`[extractNumericId DEBUG] resolveResource error:`, resolveError);
    }
    
    console.log(`[extractNumericId DEBUG] Could not extract ID from: ${input}`);
    return null;
  } catch(error) {
    console.error(`[extractNumericId DEBUG] General error:`, error);
    return null;
  }
}

global.extractNumericId = extractNumericId

async function getConferenceData(conferenceId) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM conferences WHERE conference_id = ?';
    database.query(query, [conferenceId], (error, results) => {
      if (error) {
        console.error('Ошибка при получении данных о конференции:', error);
        return reject(error);
      }
      resolve(results[0]);
    });
  });
}

async function getIq(userId) {
  // Эта функция-заглушка, чтобы избежать падения. 
  // Вам нужно будет реализовать правильную логику для получения IQ.
  return 100; 
}

async function incrementMessageCount(conferenceId, userId) {
  return new Promise((resolve, reject) => {
    const tableName = `conference_stats_${conferenceId}`;
    const query = `
      INSERT INTO ${tableName} (user_id, message_count) 
      VALUES (?, 1) 
      ON DUPLICATE KEY UPDATE message_count = message_count + 1;
    `;
    database.query(query, [userId], (error, results) => {
      if (error) {
        // Не выводим ошибку в консоль, если таблицы нет, чтобы не спамить
        if (error.code === 'ER_NO_SUCH_TABLE') {
          return resolve();
        }
        console.error('Ошибка при инкременте счетчика сообщений:', error);
        return reject(error);
      }
      resolve(results);
    });
  });
}

global.getlink = getlink

module.exports = {
  checkUserRole,
  checkIfTableExists,
  getUserRole,
  getRoleName,
  getRoleNamezov,
  getDeviceName,
  getpoolkey,
  getUserVip,
  getUsername,
  getUserTech,
  getUserVipStatus,
  getAgentInfo,
  getlink,
  extractNumericId,
  getConferenceData,
  getIq,
  incrementMessageCount
}
