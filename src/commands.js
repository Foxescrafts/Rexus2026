// commands.js
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Импорт зависимостей
const FileDB = require('./filedb');
const TextFormatter = require('./textFormatter');
const { vk } = require('./vkInstance');

class Commands {
    constructor(vk, filedb, settings, cache) {
        this.vk = vk;
        this.settings = settings;
        this.db = filedb;
        this.cache = cache;
    }

    async inviteConversation(context, inviter, memberId) {
        const peerId = context.peerId;
        
        // Check bot ban for inviter
        const userBotBan2 = await this.db.BotBansGetBan(inviter);
        if (userBotBan2 && userBotBan2.type_ban === '1') {
            const kick = await this.vk.kickUser(peerId, inviter);
            if (!kick || kick.error) {
                const resultData = await this.cache.get(`peer_invitefailbotban_${peerId}_${inviter}`);
                await this.cache.set(`peer_invitefailbotban_${peerId}_${inviter}`, Math.floor(Date.now() / 1000).toString(), 1);
                if (resultData) {
                    const timed = parseInt(resultData) || 0;
                    if (timed && Math.floor(Date.now() / 1000) < timed + 5) return;
                }
                const nameOne = await this.vk.getUrlName(inviter, 'nom');
                await context.send(`${nameOne} находится в чёрном списке бота, но он имеет права администратора в самой конференции.\n\nОбратите внимание, бот перевел эту беседу в статус 'не активирована'. Удали участника и активируйте беседу заново — /start.`);
                await this.db.peerDeactivate(peerId);
                return;
            } else {
                const resultData = await this.cache.get(`peer_invitefailbotban_${peerId}_${inviter}`);
                await this.cache.set(`peer_invitefailbotban_${peerId}_${inviter}`, Math.floor(Date.now() / 1000).toString(), 1);
                if (resultData) {
                    const timed = parseInt(resultData) || 0;
                    if (timed && Math.floor(Date.now() / 1000) < timed + 5) return;
                }
                const nameOne = await this.vk.getUrlName(inviter, 'nom');
                await context.send(`${nameOne} находится в чёрном списке бота, он(а) исключен(а) из соображений безопасности.\n\nОбратите внимание, обратное добавление этого пользователя в беседу будет расценено как подозрительное действие, приглашающий участник будет исключен.`);
                return;
            }
        }

        if (memberId === -this.settings.GROUP_ID) {
            const keyboard = await this.vk.generateKeyboard(['НАЧАТЬ'], ['start'], [this.vk.BUTTON_GREEN]);
            const text = `Для активации необходимо выдать права администратора боту, затем нажать на зелёную кнопку 'Начать' или ввести команду '/старт' без ковычек.\n\nСписок команд: vk.com/@fink_manager-aktualnye-komandy\nКак начать работу: vk.com/@fink_manager-aktualnye-komandy`;
            await context.send(text, { keyboard });
            await this.db.peersSetInviter(peerId, inviter);
        } else {
            const PeerInfo = await this.db.peersGetPeer(peerId);
            const BanInfo = await this.db.bansGetBan(peerId, memberId);
            const userBotBan = await this.db.BotBansGetBan(memberId);

            if (userBotBan) {
                if (userBotBan.type_ban === '1') {
                    const kick = await this.vk.kickUser(peerId, memberId);
                    if (!kick || kick.error) {
                        const resultData = await this.cache.get(`peer_invitefailbotban_${peerId}_${memberId}`);
                        await this.cache.set(`peer_invitefailbotban_${peerId}_${memberId}`, Math.floor(Date.now() / 1000).toString(), 1);
                        if (resultData) {
                            const timed = parseInt(resultData) || 0;
                            if (timed && Math.floor(Date.now() / 1000) < timed + 5) return;
                        }
                        const nameOne = await this.vk.getUrlName(memberId, 'nom');
                        await context.send(`${nameOne} находится в чёрном списке бота, но он имеет права администратора в самой конференции.\n\nОбратите внимание, бот перевел эту беседу в статус 'не активирована'. Удали участника и активируйте беседу заново — /start.`);
                        await this.db.peerDeactivate(peerId);
                        return;
                    } else {
                        const resultData = await this.cache.get(`peer_invitefailbotban_${peerId}_${memberId}`);
                        await this.cache.set(`peer_invitefailbotban_${peerId}_${memberId}`, Math.floor(Date.now() / 1000).toString(), 1);
                        if (resultData) {
                            const timed = parseInt(resultData) || 0;
                            if (timed && Math.floor(Date.now() / 1000) < timed + 5) return;
                        }
                        const nameOne = await this.vk.getUrlName(memberId, 'nom');
                        await context.send(`${nameOne} находится в чёрном списке бота, он(а) исключен(а) из соображений безопасности.\n\nОбратите внимание, обратное добавление этого пользователя в беседу будет расценено как подозрительное действие, приглашающий участник будет исключен.`);
                        return;
                    }
                } else if (userBotBan.type_ban === '2' || userBotBan.type_ban === '3') {
                    const resultData = await this.cache.get(`peer_invitefailbotban_${peerId}_${memberId}`);
                    await this.cache.set(`peer_invitefailbotban_${peerId}_${memberId}`, Math.floor(Date.now() / 1000).toString(), 1);
                    if (resultData) {
                        const timed = parseInt(resultData) || 0;
                        if (timed && Math.floor(Date.now() / 1000) < timed + 5) return;
                    }
                    const nameOne = await this.vk.getUrlName(memberId, 'nom');
                    await context.send(`${nameOne} находится в чёрном списке бота.\n\nОбратите внимание, при дальнейшем нахождении этого пользователя в конференции — вы подвергаете свою беседу опасности, а бот не будет реагировать на команды данного пользователя.`);
                } else if (userBotBan.type_ban === '5') {
                    const resultData = await this.cache.get(`peer_invitefailbotban_${peerId}_${memberId}`);
                    await this.cache.set(`peer_invitefailbotban_${peerId}_${memberId}`, Math.floor(Date.now() / 1000).toString(), 1);
                    if (resultData) {
                        const timed = parseInt(resultData) || 0;
                        if (timed && Math.floor(Date.now() / 1000) < timed + 5) return;
                    }
                    const nameOne = await this.vk.getUrlName(memberId, 'nom');
                    await context.send(`${nameOne} находится в стоп-листе бота.\n\nУказанный пользователь помечен как сливщик бесед.\n\nОбратите внимание, при дальнейшем нахождении этого пользователя в конференции — вы подвергаете свою беседу опасности.\n\nВ целях предотвращения слива беседы у Пользователя ограничены некоторые команды.`);
                }
            }

            if (BanInfo) {
                const nickUser = await this.db.peersGetNickUrl(peerId, memberId);
                let timeBan = 'перманентно';
                if (BanInfo.date_unban) {
                    const banTime = new Date(BanInfo.date_unban);
                    timeBan = `до ${banTime.toLocaleString()}`;
                    if (banTime.getTime() <= Date.now()) {
                        await this.db.bansDeleteBan(peerId, memberId);
                    }
                }
                let timeGiveban = 'неизвестно';
                if (BanInfo.date_ban) {
                    timeGiveban = new Date(BanInfo.date_ban).toLocaleString();
                }
                let AdminNick = await this.vk.getUrlName(parseInt(BanInfo.admin_id));
                if (parseInt(BanInfo.admin_id) < 0) {
                    AdminNick = `[club${BanInfo.admin_id.substring(1)}|Сообщество]`;
                }
                await this.vk.kickUser(peerId, memberId);
                const resultData = await this.cache.get(`peer_invitefailpeer_ban_${peerId}`);
                await this.cache.set(`peer_invitefailpeer_ban_${peerId}`, Math.floor(Date.now()  /1000).toString(), 1);
                if (resultData) {
                    const timed = parseInt(resultData) || 0;
                    if (timed && Math.floor(Date.now() / 1000) < timed + 5) return;
                }
                let text = `${nickUser} находится в списке заблокированных.\n\n⚠ Заблокировал: ${AdminNick}\n🚫 Дата блокировки: ${timeGiveban}\n🚫 Срок блокировки: ${timeBan}\n💬 Причина: ${BanInfo.reason}`;
                const targetIdText = memberId <= 0 ? `club${memberId.toString().substring(1)}` : `id${memberId}`;
                const buttonsUnban = await this.vk.generateKeyboard(['Разблокировать'], [`unban ${targetIdText}`], [this.vk.BUTTON_RED]);
                await context.send(text, { keyboard: buttonsUnban });
            }

            if (PeerInfo.set_kickinviter !== '0') {
                const inviterData = await this.db.peersGetMember(peerId, inviter);
                if (parseInt(PeerInfo.set_inviterrole) > parseInt(inviterData.priority)) {
                    await this.vk.kickUser(peerId, memberId);
                    await this.vk.kickUser(peerId, inviter);
                    await context.send('У пригласившего пользователя недостаточно полномочий для добавления участников в беседу. Для настройки используйте /settings.');
                    return;
                }
            }

            if (PeerInfo.group && PeerInfo.group !== '0') {
                const result = await this.vk.vkAPI('groups.isMember', { group_id: PeerInfo.group, user_id: memberId });
                if (!result || result.error || !result.response || result.response.toString() === '0') {
                    const resultData = await this.cache.get(`peer_invite_checkgroup_${peerId}`);
                    await this.cache.set(`peer_invite_checkgroup_${peerId}`, Math.floor(Date.now() / 1000).toString(), 1);
                    if (resultData) {
                        const timed = parseInt(resultData) || 0;
                        if (timed && Math.floor(Date.now() / 1000) < timed + 5) return;
                    }
                    await context.send(`Приглашенный пользователь не состоит в [club${PeerInfo.group}|сообществе].`);
                    if (memberId > 0) await this.vk.kickUser(peerId, memberId);
                    return;
                }
            }

            const memberInfo = await this.db.peersGetMember(peerId, memberId, true, true);
            if (memberInfo.leave_peer === '1') {
                await this.db.peersMemberSetLeavePeer(peerId, memberId, '0');
            }
            if (memberInfo.invited_by !== inviter.toString()) {
                await this.db.peersMemberSetInviter(peerId, memberId, inviter);
            }

            if (PeerInfo.welcome_text !== '0' && !BanInfo) {
                const resultData = await this.cache.get(`peer_invite_${peerId}`);
                await this.cache.set(`peer_invite_${peerId}`, Math.floor(Date.now() / 1000).toString(), 1);
                if (resultData) {
                    const timed = parseInt(resultData) || 0;
                    if (timed && Math.floor(Date.now() / 1000) < timed + 5) return;
                }
                const resPlainFormat = TextFormatter.fromMarkdown(`⚠ Приветствие, установленное администратором беседы ⚠\n\n${PeerInfo.welcome_text}`);
                if (!resPlainFormat) {
                    await context.send(`⚠ Приветствие, установленное администратором беседы ⚠\n\n${PeerInfo.welcome_text}`);
                } else {
                    await context.send(resPlainFormat.plainText, { parseMode: 'html', formatData: JSON.stringify(resPlainFormat.formatData) });
                }
            }
        }
    }

    async kickConversation(context, admin, memberId) {
        const peerId = context.peerId;
        
        if (memberId === -this.settings.GROUP_ID) {
            // Group bot kick - ignore
        }

        const Target_User = await this.db.peersGetMember(peerId, memberId);
        try {
            if (Target_User && Target_User.leave_peer === '0') {
                await this.db.peersMemberSetLeavePeer(peerId, memberId, '1');
            }
        } catch(e) {}

        try {
            const warnsDatabase = await this.db.peerGetWarnsList(peerId, memberId, false, 3);
            if (warnsDatabase) {
                for (const item of warnsDatabase) {
                    if (item.deleted !== 1) {
                        await this.db.peerWarnsDeleteWarn(item.id);
                    }
                }
                await this.db.peerMembersSetWarns(peerId, memberId, 0);
            }
        } catch(e) {}

        const PeerInfo = await this.db.peersGetPeer(peerId);
        try {
            if (PeerInfo.group !== '0' && PeerInfo.set_kickexitgroup !== '0' && PeerInfo.access_token) {
                const method = 'groups.removeUser';
                const params = {
                    group_id: PeerInfo.group,
                    user_id: memberId,
                    access_token: this.decryptString(PeerInfo.access_token)
                };
                const result = await this.vk.vkAPIs(method, params);
                if (!result.response || result.error) {
                    if (result.error?.error_code === '5') {
                        await context.send('Ошибка исключения участника из группы — токен доступа недействителен, поэтому он был отвязан от беседы.');
                    }
                    await this.db.peersSetAccessToken(peerId, '');
                }
            }
        } catch(e) {}

        let text = '';
        if (memberId === admin) {
            let nickname = 'Пользователь';
            if (Target_User) {
                nickname = await this.db.peersGetNickUrl(peerId, memberId);
            } else {
                if (admin < 0) {
                    nickname = `[public${admin.toString().substring(1)}|Сообщество]`;
                } else {
                    nickname = `[id${admin}|Пользователь]`;
                }
            }
            text = `${nickname} вышел из конференции.`;
            await context.send(text);

            if (PeerInfo.owner !== memberId.toString()) {
                try {
                    if (PeerInfo.set_kickexit !== '0' || PeerInfo.set_kickexitrole !== '0') {
                        const memberData = await this.db.peersGetMember(peerId, memberId);
                        const priority = parseInt(memberData.priority);
                        if (priority !== 0) {
                            if (PeerInfo.set_kickexitrole !== '0') {
                                await this.vk.kickUser(peerId, memberId);
                                if (priority !== 100) {
                                    await this.db.peersMemberSetPriority(peerId, memberId, 0);
                                }
                                if (PeerInfo.set_exitremovenick === '1') {
                                    await this.db.peersMemberSetNickName(peerId, memberId, null);
                                }
                            }
                        } else {
                            if (PeerInfo.set_kickexit !== '0') {
                                await this.vk.kickUser(peerId, memberId);
                                if (PeerInfo.set_exitremovenick === '1') {
                                    await this.db.peersMemberSetNickName(peerId, memberId, null);
                                }
                            }
                        }
                    }
                } catch(e) {}
                try {
                    if (Target_User && Target_User.mute) {
                        await this.db.peersMemberSetMute(peerId, memberId, '');
                        text = `⚠ У ${nickname} была блокировка чата, она автоматически снята.\n\n`;
                        await context.send(text);
                    }
                } catch(e) {}
            }
        }
    }

    async systemMute(userInfo, context) {
        if (!userInfo || !userInfo.mute) return false;
        if (parseInt(userInfo.priority) >= 100) return false;
        
        const muteDate = new Date(userInfo.mute).getTime();
        const currentTime = Date.now();
        
        if (muteDate > currentTime) {
            const PeerInfo = await this.db.peersGetPeer(context.peerId);
            if (PeerInfo.set_typemute === '1') {
                await this.vk.kickUser(context.peerId, context.senderId);
            } else {
                await this.vk.deleteMessage(context.peerId, context.messageId.toString());
            }
            return true;
        } else {
            await this.db.peersMemberSetMute(context.peerId, context.senderId, '');
            return false;
        }
    }

    async handlerMenu(context, menu) {
        context.text = context.text?.replace(/'/g, '').replace(/"/g, '');
        
        const banms = new BotBan(this.vk, this.db, this.settings);
        const target = await banms.checkBotBan(context);
        if (target) return false;

        if (this.settings.isUserChat(context.peerId)) {
            const checkedUser = new LsCmds(this.vk, this.db, this.settings, this.cache);
            return checkedUser.handlerMenu(menu);
        }

        context.text = context.text?.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/<br>/g, ' ');
        
        const ownerCmds = new OwnerCmds(this.vk, this.db, this.settings, this.cache);
        switch (menu) {
            case 1: // SETUP_MAIN
                await ownerCmds.commandSetup(context, menu);
                return true;
            case 2: // SETUP_STEP2
                await ownerCmds.commandSettingsSet(context, menu);
                return true;
            case 3: // SETUP_STEP3
                await ownerCmds.commandSettingsSet(context, menu);
                return true;
            case 4: // MENU_EDITUNITY_SETNAME
                await ownerCmds.commandEditUnityName(context, menu);
                return true;
            case 5: // MENU_EDITUNITY_SETDESCRIPTION
                await ownerCmds.commandEditUnityDesc(context, menu);
                return true;
            case 6: // MENU_EDITCMD
                await ownerCmds.commandEditCmd(context, menu);
                return true;
            case 7: // MENU_GEDITCMD
                await ownerCmds.commandGEditCmd(context, menu);
                return true;
            default:
                return false;
        }
    }

    async handlerCommand(context) {
        try {
            context.text = context.text?.replace(/'/g, '').replace(/"/g, '');
            const text = context.text?.replace(/<br>/g, ' ') || '';
            const lowercase = text.toLowerCase();
            const params = text.split(' ');
            const paramsLow = lowercase.split(' ');
            
            let command = '';
            if (text) {
                command = paramsLow[0]?.substring(1) || paramsLow[0];
            }

            // Check if bot is running in pot mode
            if (!this.settings.isPot && context.senderId !== 251372816 && context.senderId !== 549678497) {
                return false;
            }

            const userInfoGlobal = await this.db.usersGetUser(context.senderId);

            if (this.settings.isUserChat(context.peerId)) {
                if (userInfoGlobal.accept_ls !== '1') {
                    await this.db.gameSetAcceptLs(context.senderId, 1);
                }
                const checkedUser = new LsCmds(this.vk, this.db, this.settings, this.cache);
                return await checkedUser.checkCmd(text);
            }

            const peerInfo = await this.db.peersGetPeer(context.peerId);
            const userCommands = new UserCmds(this.vk, this.db, this.settings);

            if (command === 'start' || command === 'старт' || command === 'начать' || command === 'запустить') {
                await userCommands.commandStart(context);
                return true;
            }

            if (command === 'ping' || command === 'пинг' || command === 'статус' || command === 'status' || command === 'test' || command === 'тест') {
                await userCommands.commandPing(context);
                return true;
            }

            if (peerInfo.active === '0') return false;

            const memberInfo = await this.db.peersGetMember(context.peerId, context.senderId);
            if (peerInfo.silence !== '0' && memberInfo.priority === '0') {
                if (peerInfo.silence === '1') {
                    await this.vk.kickUser(context.peerId, context.senderId);
                } else {
                    await this.vk.deleteMessage(context.peerId, context.messageId.toString());
                }
            }

            if (!await this.checkFilters(peerInfo, text, memberInfo, context)) return false;
            if (!text) return false;
            if (lowercase.length <= 0) return false;

            // Check if first character is command prefix
            if (lowercase[0] !== '!' && lowercase[0] !== '/' && lowercase[0] !== '+' && lowercase[0] !== '-') {
                return false;
            }

            const ownerCmds = new OwnerCmds(this.vk, this.db, this.settings, this.cache);
            const helperCmds = new HelperCmds(this.vk, this.db, this.settings);
            const moderCmds = new ModerCmds(this.vk, this.db, this.settings);
            const adminCmds = new AdminCmds(this.vk, this.db, this.settings);
            const gladminCmds = new GlAdminCmds(this.vk, this.db, this.settings);
            const checkedUser = new LsCmds(this.vk, this.db, this.settings, this.cache);
            const vipsCmds = new VipsCmds(this.vk, this.db, this.settings);

            // User commands switch
            switch (command) {
                case 'zudilov':
                    await userCommands.commandTest(context);
                    return true;
                case 'quit':
                case 'q':
                case 'выйти':
                    await userCommands.commandQuit(context);
                    return true;
                case 'ping':
                case 'пинг':
                case 'статус':
                case 'status':
                case 'test':
                case 'тест':
                case 'joke':
                    await userCommands.commandPing(context);
                    return true;
                case 'gc':
                    await userCommands.commandGc(context);
                    return true;
                case 'cmds':
                case 'help':
                case 'команды':
                case 'помощь':
                case 'хелп':
                    await userCommands.commandHelp(context);
                    return true;
                case 'try':
                case 'попытка':
                    await userCommands.commandTry(context);
                    return true;
                case 'kiss':
                case 'поцелуй':
                case 'поцеловать':
                    await userCommands.commandKiss(context);
                    return true;
                case 'админы':
                case 'admins':
                case 'staff':
                    await userCommands.commandStaff(context);
                    return true;
                case 'обнять':
                    await userCommands.commandObnyat(context);
                    return true;
                case 'погладить':
                    return true;
                case 'убить':
                    return true;
                case 'изнасиловать':
                case 'надругаться':
                case 'трахнуть':
                case 'trax':
                    await userCommands.commandIznas(context);
                    return true;
                case 'минет':
                case 'minet':
                    await userCommands.commandMinet(context);
                    return true;
                case 'mtop':
                case 'мтоп':
                    await userCommands.commandMtop(context);
                    return true;
                case 'online':
                case 'онлайн':
                    await userCommands.commandOnline(context);
                    return true;
                case 'правила':
                case 'rules':
                    await userCommands.commandRules(context);
                    return true;
                case 'скажи':
                case 'voice':
                    await userCommands.commandVoice(context);
                    return true;
                case 'sban':
                case 'сбан':
                    await userCommands.commandSban(context);
                    return true;
                default:
                    break;
            }

            // Helper commands switch
            switch (command) {
                case 'стата':
                case 'статистика':
                case 'stats':
                    await helperCmds.commandStats(context);
                    return true;
                case 'mute':
                case 'мут':
                    await helperCmds.commandMute(context);
                    return true;
                case 'унмут':
                case 'unmute':
                    await helperCmds.commandUnmute(context);
                    return true;
                case 'kick':
                case 'кик':
                    await helperCmds.commandKick(context);
                    return true;
                case 'пред':
                case 'warn':
                    await helperCmds.commandWarn(context);
                    return true;
                case 'снятьпред':
                case 'unwarn':
                    await helperCmds.commandUnwarn(context);
                    return true;
                case 'предупреждения':
                case 'warns':
                    await helperCmds.commandGetwarn(context);
                    return true;
                case 'чатинфо':
                case 'info':
                    await helperCmds.commandChatinfo(context);
                    return true;
                case 'ник':
                case 'getnick':
                    await helperCmds.commandGetnick(context);
                    return true;
                case 'сник':
                case 'setnick':
                    await helperCmds.commandSetnick(context);
                    return true;
                case 'рник':
                case 'removenick':
                    await helperCmds.commandRemovenick(context);
                    return true;
                case 'вызов':
                case 'zov':
                    await helperCmds.commandZov(context);
                    return true;
                case 'reg':
                case 'рег':
                    await helperCmds.commandReg(context);
                    return true;
                default:
                    break;
            }

            // Moder commands switch
            switch (command) {
                case 'бан':
                case 'ban':
                    await moderCmds.commandBan(context);
                    return true;
                case 'унбан':
                case 'unban':
                    await moderCmds.commandUnban(context);
                    return true;
                case 'помощник':
                case 'helper':
                    await moderCmds.commandAddhelper(context);
                    return true;
                case 'role':
                case 'роль':
                    await moderCmds.commandSetrole(context);
                    return true;
                case 'rr':
                    await moderCmds.commandRemoverole(context);
                    return true;
                case 'roles':
                case 'роли':
                    await moderCmds.commandRoles(context);
                    return true;
                case 'тишина':
                case 'silence':
                    await moderCmds.commandSilence(context);
                    return true;
                case 'banlist':
                case 'bans':
                    await moderCmds.commandBanlist(context);
                    return true;
                default:
                    break;
            }

            // Admin commands switch
            switch (command) {
                case 'grole':
                    await adminCmds.commandGsetrole(context);
                    return true;
                case 'ghelper':
                    await adminCmds.commandGhelper(context);
                    return true;
                case 'gmoder':
                    await adminCmds.commandGmoder(context);
                    return true;
                case 'модер':
                case 'moder':
                    await adminCmds.commandModer(context);
                    return true;
                case 'gban':
                    await adminCmds.commandGban(context);
                    return true;
                case 'gunban':
                    await adminCmds.commandGunban(context);
                    return true;
                case 'del':
                case 'delete':
                    await adminCmds.commandDelete(context);
                    return true;
                case 'gm':
                    await adminCmds.commandGm(context);
                    return true;
                default:
                    break;
            }

            // Global admin commands switch
            switch (command) {
                case 'pin':
                    await gladminCmds.commandPin(context);
                    return true;
                case 'unpin':
                    await gladminCmds.commandUnpin(context);
                    return true;
                case 'admin':
                case 'админ':
                    await gladminCmds.commandAddadmin(context);
                    return true;
                case 'gadmin':
                    await gladminCmds.commandGadmin(context);
                    return true;
                case 'newrole':
                    await gladminCmds.commandNewrole(context);
                    return true;
                case 'welcome':
                case 'приветствие':
                    await gladminCmds.commandWelcome(context);
                    return true;
                case 'group':
                case 'setgroup':
                    await gladminCmds.commandSetpublic(context);
                    return true;
                case 'setrules':
                    await gladminCmds.commandSetrules(context);
                    return true;
                default:
                    break;
            }

            // Owner commands switch
            switch (command) {
                case 'setup':
                    await ownerCmds.commandSetup(context);
                    return true;
                case 'settings':
                case 'настройки':
                    await ownerCmds.commandSettings(context);
                    return true;
                case 'sync':
                    await ownerCmds.commandSync(context);
                    return true;
                case 'unity':
                    await ownerCmds.commandUnity(context);
                    return true;
                case 'unites':
                    await ownerCmds.commandUnites(context);
                    return true;
                case 'addunity':
                    await ownerCmds.commandAddunity(context);
                    return true;
                case 'removeunity':
                    await ownerCmds.commandRemoveunity(context);
                    return true;
                case 'createunity':
                    await ownerCmds.commandCreateunity(context);
                    return true;
                case 'editunity':
                    await ownerCmds.commandEditunity(context);
                    return true;
                case 'deleteunity':
                    await ownerCmds.commandDeleteunity(context);
                    return true;
                case 'spec':
                case 'addspec':
                    await ownerCmds.commandAddspec(context);
                    return true;
                case 'wipe':
                    await ownerCmds.commandWipe(context);
                    return true;
                default:
                    break;
            }

            // VIPS commands switch
            switch (command) {
                case 'эмодзи':
                case 'emoji':
                    await vipsCmds.commandEmoji(context);
                    return true;
                default:
                    break;
            }

            return await checkedUser.checkCmd(command);
        } catch (ex) {
            console.error('Error in handlerCommand:', ex);
            return true;
        }
    }

    async checkFilters(peerInfo, text, memberInfo, context) {
        // Anti-flood check
        if (memberInfo.priority === '0') {
            // Run anti-flood check asynchronously
            this.checkAntiFloodBotInPeer(this.db, this.cache, this.vk, peerInfo, context);
        }

        // Photo filter
        if (context.attachments?.length >= 1 && peerInfo.set_kickphotos !== '0' && memberInfo.priority === '0' && context.senderId !== -this.settings.GROUP_ID) {
            for (const attachment of context.attachments) {
                if (attachment.type === 'photo') {
                    if (peerInfo.set_kickphotos === '2') {
                        await this.vk.kickUser(context.peerId, context.senderId);
                        await this.vk.deleteMessage(context.peerId, context.messageId.toString());
                        const url = await this.vk.userGetNameUrls([context.senderId]);
                        await context.send(`${url[context.senderId]} был исключен за отправку фотографий в чат.`);
                    } else {
                        await this.vk.deleteMessage(context.peerId, context.messageId.toString());
                    }
                    return false;
                }
            }
        }

        // Wall posts filter
        if (context.attachments?.length >= 1 && peerInfo.set_kickposts !== '0' && memberInfo.priority === '0' && context.senderId !== -this.settings.GROUP_ID) {
            for (const attachment of context.attachments) {
                if (attachment.type === 'wall') {
                    if (peerInfo.set_kickposts === '2') {
                        await this.vk.kickUser(context.peerId, context.senderId);
                        await this.vk.deleteMessage(context.peerId, context.messageId.toString());
                        const url = await this.vk.userGetNameUrls([context.senderId]);
                        await context.send(`${url[context.senderId]} был исключен за отправку постов в чат.`);
                    } else {
                        await this.vk.deleteMessage(context.peerId, context.messageId.toString());
                    }
                    return false;
                }
            }
        }

        // Emoji count check
        const stringForCheckEmoji = await this.getAllFwdMessages(context.fwdMessages) + await this.getAllTextAttachments(context.attachments) + text;
        const countEmoji = this.vk.emojiCount(stringForCheckEmoji);
        
        if (countEmoji >= 250 && memberInfo.priority === '0' && context.senderId !== -this.settings.GROUP_ID) {
            if (peerInfo.set_action_activity === '1') {
                const resultCache = await this.cache.get(`peerActivityFailKick_${context.peerId}_${context.senderId}`);
                if (resultCache) {
                    const timed = parseInt(resultCache) || 0;
                    if (timed && Math.floor(Date.now() / 1000) < timed + 5) return false;
                }
                await this.db.messageDeletedFilterInsert(context.peerId, context.senderId, context.messageId, stringForCheckEmoji);
                const buttons = await this.vk.generateKeyboard(['Посмотреть'], [`getdel ${context.messageId}`], [this.vk.BUTTON_RED]);
                await this.vk.deleteMessage(context.peerId, context.messageId.toString());
                const kick = await this.vk.kickUser(context.peerId, context.senderId);
                if (!kick || kick.error) {
                    await this.cache.set(`peerActivityFailKick_${context.peerId}_${context.senderId}`, Math.floor(Date.now() / 1000).toString(), 1);
                    const nameOne = await this.vk.getUrlName(context.senderId, 'nom');
                    await context.send(`${nameOne} должен быть исключен за подозрительную активность (большое количество стикеров), но он имеет права администратора в самой конференции.\n\nУдалите участника вручную, либо снимите с него права администратора в беседе ВК.`, { keyboard: buttons });
                    return false;
                }
                const nick = context.senderId <= 0 ? `[club${context.senderId.toString().substring(1)}|Сообщество] было исключено.` : `[id${context.senderId}|Пользователь] был исключен.`;
                await context.send(`${nick}\nПричина: подозрительная активность (большое количество стикеров).\n\nДанную настройку в рамках беседы можно настроить в /settings - 2 - 5.`, { keyboard: buttons });
            } else if (peerInfo.set_action_activity === '2') {
                await this.db.messageDeletedFilterInsert(context.peerId, context.senderId, context.messageId, stringForCheckEmoji);
                const buttons = await this.vk.generateKeyboard(['Посмотреть'], [`getdel ${context.messageId}`], [this.vk.BUTTON_RED]);
                await this.vk.deleteMessage(context.peerId, context.messageId.toString());
                const muteUntil = new Date(Date.now() + 3600000);
                await this.db.peersMemberSetMute(context.peerId, context.senderId, muteUntil.toISOString());
                const nick = context.senderId <= 0 ? `[club${context.senderId.toString().substring(1)}|Сообщество] получило блокироку чата.` : `[id${context.senderId}|Пользователь] получил блокировку чата.`;
                await context.send(`${nick}\nПричина: подозрительная активность (большое количество стикеров).\nОкончание блокировки: ${new Date(Date.now() + 3600000).toLocaleString()}\n\nДанную настройку в рамках беседы можно настроить в /settings - 2 - 5.`, { keyboard: buttons });
            }
        }

        return true;
    }

    async getAllFwdMessages(fwdMessages) {
        if (!fwdMessages) return '';
        let result = '';
        const max = 4;
        let i = 0;
        
        for (const msg of fwdMessages) {
            try {
                if (i >= max) break;
                if (msg.text) {
                    result += msg.text + ' ';
                    i++;
                }
                if (msg.fwd_messages) {
                    result += await this.getAllFwdMessages(msg.fwd_messages);
                }
            } catch(e) {
                if (msg?.text) {
                    result += msg.text + ' ';
                    i++;
                }
            }
        }
        return result;
    }

    async getAllTextAttachments(attachments) {
        if (!attachments) return '';
        let result = '';
        const max = 4;
        let i = 0;
        
        for (const attachment of attachments) {
            try {
                if (i >= max) break;
                if (attachment.type === 'wall' && attachment.wall?.text) {
                    result += attachment.wall.text;
                    i++;
                }
            } catch(e) {}
        }
        return result;
    }

    async checkAntiFloodBotInPeer(db, cache, vk, peerInfo, context) {
        try {
            const predCache = await cache.get(`afBot_${context.senderId}`);
            let textLocal = context.text || '';
            
            if (context.attachments) {
                for (const item of context.attachments) {
                    if (item.type === 'sticker') {
                        textLocal += item.sticker.sticker_id;
                    } else if (['wall', 'wall_reply', 'photo'].includes(item.type)) {
                        return;
                    }
                }
            }
            
            const timeNow = Date.now();
            const tempDic = {
                pred_text: textLocal,
                count: '1',
                date_last: new Date(timeNow).toISOString()
            };
            
            let count = 1;
            if (predCache && predCache.pred_text !== undefined) {
                const similarity = this.calculateSimilarity(predCache.pred_text, textLocal);
                const timePred = new Date(predCache.date_last);
                
                if (similarity >= 0.8) {
                    if (timePred.getTime() + 10000 >= timeNow) {
                        count = parseInt(predCache.count) + 1;
                        predCache.count = count.toString();
                    } else {
                        Object.assign(predCache, tempDic);
                    }
                } else {
                    if (timePred.getTime() + 2000 >= timeNow) {
                        count = parseInt(predCache.count) + 1;
                        predCache.count = count.toString();
                    } else {
                        Object.assign(predCache, tempDic);
                    }
                }
                await cache.set(`afBot_${context.senderId}`, predCache, 1);
            } else {
                await cache.set(`afBot_${context.senderId}`, tempDic, 1);
            }
            
            if (count >= 4) {
                await cache.set(`afBot_${context.senderId}`, tempDic, 1);
                try {
                    await db.antifloodAddPriority(context.senderId);
                    if (peerInfo.set_action_activity === '1') {
                        const resultCache = await cache.get(`peerActivityFailKick_${context.peerId}_${context.senderId}`);
                        if (resultCache) {
                            const timed = parseInt(resultCache) || 0;
                            if (timed && Math.floor(Date.now() / 1000) < timed + 5) return;
                        }
                        const kick = await vk.kickUser(context.peerId, context.senderId);
                        if (!kick || kick.error) {
                            await cache.set(`peerActivityFailKick_${context.peerId}_${context.senderId}`, Math.floor(Date.now() / 1000).toString(), 1);
                            const nameOne = await vk.getUrlName(context.senderId, 'nom');
                            await context.send(`${nameOne} должен быть исключен за подозрительную активность, но он имеет права администратора в самой конференции.\n\nУдалите участника вручную, либо снимите с него права администратора в беседе ВК.`);
                            return;
                        }
                        const nick = context.senderId <= 0 ? `[club${context.senderId.toString().substring(1)}|Сообщество] было исключено.` : `[id${context.senderId}|Пользователь] был исключен.`;
                        await context.send(`${nick}\nПричина: подозрительная активность.\n\nДанную настройку в рамках беседы можно настроить в /settings - 2 - 5.`);
                    } else if (peerInfo.set_action_activity === '2') {
                        const muteUntil = new Date(Date.now() + 3600000);
                        await db.peersMemberSetMute(context.peerId, context.senderId, muteUntil.toISOString());
                        const nick = context.senderId <= 0 ? `[club${context.senderId.toString().substring(1)}|Сообщество] получило блокироку чата.` : `[id${context.senderId}|Пользователь] получил блокировку чата.`;
                        await context.send(`${nick}\nПричина: подозрительная активность.\nОкончание блокировки: ${new Date(Date.now() + 3600000).toLocaleString()}\n\nДанную настройку в рамках беседы можно настроить в /settings - 2 - 5.`);
                    }
                } catch(e) {}
            }
        } catch(e) {
            console.error('Anti-flood check error:', e);
        }
    }

    calculateSimilarity(source, target) {
        if (!source || !target) return 0;
        if (source === target) return 1;
        const stepsToSame = this.computeLevenshteinDistance(source, target);
        return 1 - (stepsToSame / Math.max(source.length, target.length));
    }

    computeLevenshteinDistance(source, target) {
        if (!source || !target) return 0;
        if (source === target) return source.length;
        
        const sourceLen = source.length;
        const targetLen = target.length;
        
        if (sourceLen === 0) return targetLen;
        if (targetLen === 0) return sourceLen;
        
        const distance = Array(sourceLen + 1);
        for (let i = 0; i <= sourceLen; i++) distance[i] = Array(targetLen + 1);
        
        for (let i = 0; i <= sourceLen; i++) distance[i][0] = i;
        for (let j = 0; j <= targetLen; j++) distance[0][j] = j;
        
        for (let i = 1; i <= sourceLen; i++) {
            for (let j = 1; j <= targetLen; j++) {
                const cost = target[j - 1] === source[i - 1] ? 0 : 1;
                distance[i][j] = Math.min(
                    distance[i - 1][j] + 1,
                    distance[i][j - 1] + 1,
                    distance[i - 1][j - 1] + cost
                );
            }
        }
        return distance[sourceLen][targetLen];
    }

    decryptString(encrypted) {
        const algorithm = 'aes-256-cbc';
        const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!', 'utf8');
        const [ivHex, encryptedText] = encrypted.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}

module.exports = { Commands }; 
