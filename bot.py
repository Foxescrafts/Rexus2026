import vk_api
from vk_api.longpoll import VkLongPoll, VkEventType
import time
import threading
import random

# Настройки
TOKEN = "vk1.a.HRM49bejlLbwle4hWODijzL-nCE1BKSDdw1CWC-gNVpeXNqZP6wk40yiLJHvkGtbDcgpEKGYLPp8HaMU1B9JGUcdiNORK5OwwKr8NHeqTyAM42YHxT2kAE4-iT89z_UrW1qGjXocD0PRDYPsIIcF0xXvqy2SfhbZF2vDKIfnoaJssWmaptO3B93TV1EKXSobIPsHtNU0LaeFIla7MAwO3g"
TRIGGER_MESSAGE = "."  # Напишите точку в беседе для активации
INTERVAL_MIN = 3  # минимальный интервал в минутах
INTERVAL_MAX = 5  # максимальный интервал в минутах

AD_MESSAGE = """🤖 Создаю ботов ВКонтакте под любые задачи!
🔧 Гарантирую качественный и стабильный код — по доступной цене.

🏆 Примеры удачных проектов:
vk.com/flinmanager · vk.com/vzaimnosub · vk.com/groundmanager · vk.com/vinecm · vk.com/manageralti · vk.com/tweakmanager … и многие другие.

💼 Продаётся исходный код — без обязательных обновлений или дополнительных условий. Обновления и доработки можно заказывать отдельно, если захотите.

💸 Возврат средств возможен, если бот выполнен некорректно или содержит ошибки, нарушающие техническое задание.
❗ В иных случаях возврат не предусмотрен.

💬 Отзывы: vk.com/topic-227115494_53235222"""

# Хранилище активных бесед
active_chats = {}

def send_periodic_messages(vk, peer_id):
    """Функция для периодической отправки сообщений в беседу"""
    while peer_id in active_chats:
        try:
            # Случайный интервал между INTERVAL_MIN и INTERVAL_MAX минутами
            interval = random.randint(INTERVAL_MIN * 60, INTERVAL_MAX * 60)
            time.sleep(interval)
            
            if peer_id in active_chats:
                vk.messages.send(
                    peer_id=peer_id,
                    message=AD_MESSAGE,
                    random_id=random.randint(1, 2**31)
                )
                print(f"[✓] Сообщение отправлено в беседу {peer_id}")
        except Exception as e:
            print(f"[✗] Ошибка при отправке в {peer_id}: {e}")
            break

def main():
    """Основная функция бота"""
    try:
        vk_session = vk_api.VkApi(token=TOKEN)
        vk = vk_session.get_api()
        longpoll = VkLongPoll(vk_session)
        
        print("[*] Бот запущен и ожидает сообщения...")
        print(f"[*] Триггер: '{TRIGGER_MESSAGE}'")
        print(f"[*] Интервал отправки: {INTERVAL_MIN}-{INTERVAL_MAX} минут")
        
        for event in longpoll.listen():
            if event.type == VkEventType.MESSAGE_NEW:
                peer_id = event.peer_id
                text = event.text.strip()
                from_me = event.from_me
                
                # Реагируем только на свои сообщения
                if not from_me:
                    continue
                
                # Если получено сообщение с точкой
                if text == TRIGGER_MESSAGE:
                    if peer_id not in active_chats:
                        active_chats[peer_id] = True
                        
                        # Запускаем поток для периодической отправки
                        thread = threading.Thread(
                            target=send_periodic_messages,
                            args=(vk, peer_id),
                            daemon=True
                        )
                        thread.start()
                        
                        print(f"[+] Активирована беседа {peer_id}")
                        
                        # Отправляем первое сообщение сразу
                        try:
                            vk.messages.send(
                                peer_id=peer_id,
                                message=AD_MESSAGE,
                                random_id=random.randint(1, 2**31)
                            )
                            print(f"[✓] Первое сообщение отправлено в {peer_id}")
                        except Exception as e:
                            print(f"[✗] Ошибка: {e}")
                    else:
                        print(f"[!] Беседа {peer_id} уже активна")
                
                # Команда для остановки (опционально)
                elif text.lower() == "стоп":
                    if peer_id in active_chats:
                        del active_chats[peer_id]
                        print(f"[-] Деактивирована беседа {peer_id}")
                        try:
                            vk.messages.send(
                                peer_id=peer_id,
                                message="⏹ Рассылка остановлена",
                                random_id=random.randint(1, 2**31)
                            )
                        except:
                            pass
    
    except Exception as e:
        print(f"[✗] Критическая ошибка: {e}")

if __name__ == "__main__":
    main()
