$(function() {
	var FADE_TIME = 150; // ms
	var TYPING_TIMER_LENGTH = 400; // ms
	var COLORS = ['#e21400', '#91580f', '#f8a700', '#f78b00', '#58dc00', '#287b00', '#a8f07a', '#4ae8c4', '#3b88eb', '#3824aa', '#a700ff', '#d300e7'];
	var $window = $(window);
	var $usernameInput = $('#usernameInput'); // Input for username
	var $messages = $('.messages'); // Messages area
	var $inputMessage = $('.inputMessage'); // Input message input box
	var $loginPage = $('.login'); // The login page
	var $chatPage = $('.main_section'); // The chatroom page
	var $customInput = $('#customInput'); //這是紀錄輸入姓名的input的內容
	var $currentInput = $usernameInput.focus(); //對話框
	var joinRoomMessage = {}; //紀錄顧客登入的姓名、房間號碼
	var agreeTalk = false; //可以發言
	var staffRoomNumber; //更新客服的房間的ID
	var countdownSecond_repair=10; //當客服已經斷線，此時有10秒的時間可以重新找客服配對
	var stafftrueName; //配對到的客服姓名
	var username; //顧客的姓名
	var repairRoom;//更新進入的房間號碼
	var userAgent = navigator.userAgent; //取得瀏覽器的userAgent字串
	var isOpera = userAgent.indexOf("Opera") > -1; //判斷是否Opera瀏覽器
	var isIE = userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1 && !isOpera; //判斷是否IE瀏覽器
	var isIE11 = userAgent.indexOf("rv:11.0") > -1; //判斷是否是IE11瀏覽器
	var isEdge = userAgent.indexOf("Edge") > -1 && !isIE; //判斷是否IE的Edge瀏覽器
	var socket = io('localhost:1880'); //連接node-red
	$chatPage.hide();
	//顧客登入頁面的選人物特效
	$('.select_portrait img').hover(function() {
		var portrait_id = $(this).attr('portrait_id');
		$('.user_portrait img').attr('src', 'images/user/' + portrait_id + '.png');
	}, function() {
		var t_id = $('.user_portrait img').attr('portrait_id');
		$('.user_portrait img').attr('src', 'images/user/' + t_id + '.png');
	});
	$('.select_portrait img').click(function(event) {
		var portrait_id = $(this).attr('portrait_id');
		$('.user_portrait img').attr('portrait_id', portrait_id);
		$('.select_portrait img').removeClass('t');
		$(this).addClass('t');
	});
	//判斷頁面離開方式
	if (!isIE && !isEdge && !isIE11) { //相容chrome和firefox
		var _beforeUnload_time = 0,
			_gap_time = 0;
		var is_fireFox = navigator.userAgent.indexOf("Firefox") > -1; //是否是火狐瀏覽器
		window.onunload = function() {
			_gap_time = new Date().getTime() - _beforeUnload_time;
			var deleteTable = {
				username: username,
				type: "custom",
				repairRoom: repairRoom,
				staffRoomNumber: staffRoomNumber
			}
			if (agreeTalk == true) {
				if (_gap_time <= 5) {//網頁直接被關閉
					socket.emit('disconnect1', deleteTable);
				} else {//網頁重新整理
					socket.emit('disconnect1', deleteTable);
				}
			}
		}
		window.onbeforeunload = function() {
			_beforeUnload_time = new Date().getTime();
			if (is_fireFox) { //火狐關閉執行
				socket.emit('disconnect1', deleteTable);
			}
		};
	}
	//點擊發送訊息的按鈕
	$("#sendMessage").click(function() {
		sendMessage();
		$('#Message').val('');
	});
	// 設置顧客username
	function setUsername() {
		username = cleanInput($customInput.val().trim());
		if (username) {
			$loginPage.fadeOut("slow");
			$loginPage.off('click');
			$chatPage.show();
			console.log("username:", username);
			joinRoomMessage = {
				username: username,
				type: "custom",
				userRoom: username
			};
			console.log("joinRoomMessage", joinRoomMessage);
			socket.emit('checkStaffOnline_custom'); //確認是否有任何客服已在線
		}
	}
	//發送訊息
	function sendMessage() {
		let message = $('#Message').val();
		if (message) {
			console.log("訊息:",message);
			$inputMessage.val('');
			var newMessage = {};
			newMessage = {
				username: username,
				message: message,
				userRoom: repairRoom,
				type: "custom",
				stafftrueName: stafftrueName
			};
			socket.emit('new message', newMessage);
			console.log("傳送的訊息:", newMessage);
		}
	}
	//增加訊聊天聊天
	function addChatMessage(data, options) {
		console.log("訊息:", data);
		var nowHour = new Date().getHours();
		var nowMinutes = new Date().getMinutes();
		let cmessages = data.message;
		console.log('repairRoom', repairRoom);
		$('.member_list').find(`#${repairRoom}`).parent().next().text(data.message);
		if (data.type == "custom") {
					let chatMessage = $('<div>').addClass('chat-body1 clearfix').css({
						'padding-left': '70%'
					});
					let recordChatTime = $('<div>').addClass('chat_time pull-left').text(nowHour + ":" + nowMinutes).css('margin-top', '9px')
					chatMessage.append(recordChatTime, `<p style="text-align:right;direction: ltr;margin-left :40px;margin-top: 5px;padding: 0px 10px;">  ${data.message}</p>`);
					$('.chat_area ul').addClass('left clearfix admin_chat').append(chatMessage).css("backgroundColor", "#ffffff")
		} else if (data.type == "staff") {
					let chatMessage = $('<div>').addClass('chat-body1 clearfix')
					let ccmessage = $('<p>').css('margin-left', '20px').css('width', '15%').text(data.message)
					let recordChatTime = $('<div>').addClass('chat_time pull-right').css('margin-right', '73%').text(nowHour + ":" + nowMinutes)
					chatMessage.append(recordChatTime, ccmessage);
					$('.chat_area ul').addClass('left clearfix admin_chat').append(chatMessage).css("backgroundColor", "#ffffff")
					$('.chat-body clearfix > .contact_sec > strong').text(data.message);
		}
	}
	function cleanInput(input) {
		return $('<div/>').text(input).html();
	}
	$window.keydown(event => {
		if (!(event.ctrlKey || event.metaKey || event.altKey)) {
			$currentInput.focus();
		}
		if (event.which === 13) {
			if (agreeTalk == false) {
				setUsername();
			}
		}
	});
	$loginPage.click(() => {
		$currentInput.focus();
	});
	$inputMessage.click(() => {
		$inputMessage.focus();
	});
	socket.on('new message', (newMessage) => {
		console.log('new message', newMessage);
		console.log(repairRoom);
		addChatMessage(newMessage);
	});
	socket.on('staffRefuse', (data) => {
		console.log('staffRefuse', data);
		$('#secondData').text("很抱歉，目前客服皆忙線中，請梢等再登入此平台");
		socket.emit('checkStaffOnline_custom');
	});
	socket.on('staffAgree', (data) => {
		$chatPage.show();
		$('#countdown').modal('hide');
		console.log('staffAgree', data);
		repairRoom = data.userRoom;
		var change = {
			username: username,
			userRoom: data.userRoom,
			type: data.type,
			cust: data.cust
		}
		console.log('change:',change);
		stafftrueName = data.username; //傳送訊的訊息會記錄在DB裡面
		agreeTalk = true;
		countdownSecond_repair = 10;
	});
	socket.on('staffOnlineList', (data) => {
		console.log('staffOnlineList', data[0]);
		//若沒客服上線
		$('#countdown').modal('show');
		if (data[0].length === 0) {
			var interval = setInterval(function() {
				console.log("配對倒數的秒數",countdownSecond_repair);
				$('#secondData').text(countdownSecond_repair + "秒後，若沒有配對成功就會再次配對");
				if (countdownSecond_repair <= 0) {
					clearInterval(interval);
					socket.emit('checkStaffOnline_custom');
					countdownSecond_repair=10;
				} else if (agreeTalk == true) { //成功與客服配對後就會將此setInterval清掉
					clearInterval(interval);
				} else {
					countdownSecond_repair--;
					socket.emit('checkStaffOnline_custom');
					clearInterval(interval);
				}
			}, 1000);
		} else {
			// 有客服上限，選上線次數最少的客服配對
			// 依照[客服、配對次數]組成json格式
			var staff_match_count_min = data[0].filter(function(item, index, array) {
				let number = Math.min(...data[0].map(p => p.macth_count));
				return item.macth_count == number;
			});
			console.log("staff_match_count_min:",staff_match_count_min);
			number = staff_match_count_min[0].staffName;
			//如果同時有多位員工配對次數都一樣最小，隨機選一名客服作配對
			if (staff_match_count_min.length > 1) {
				let randomNumber = Math.floor(Math.random() * staff_match_count_min.length);
				number = staff_match_count_min[randomNumber].staffName;
			}
			staffRoomNumber = number;
			console.log("staffRoomNumber:",staffRoomNumber);
			let nowSec = Date.now();
			repairRoom = nowSec % 10000000 + "_" + joinRoomMessage.username;
			var decideToPair = {
				username: joinRoomMessage.username,
				type: joinRoomMessage.type,
				staffid: staffRoomNumber,
				userRoom: staffRoomNumber,
				repairRoom: repairRoom
			};
			var userRoom = {
				userRoom: repairRoom
			};
			socket.emit('decideUserLogin', decideToPair);
			socket.emit('joinRoom', userRoom); // 顧客加入房間
			$('#secondData').text("已找到客服再幫您配對中");
			console.log("decideToPair", decideToPair);
		}
	});
	socket.on('disconnect', (data) => {
		console.log('disconnect', data);
		var deleteTable = {
			username: username,
			type: "custom",
			repairRoom: repairRoom,
			staffRoomNumber: staffRoomNumber
		}
		socket.emit('disconnect1', deleteTable);
	});
	socket.on('staffDisconnect', (data) => {
		console.log('staffDisconnect', data);
		socket.emit('checkStaffOnline_custom');
		$('#secondData').text("您的客服已經離線，現在正幫您配對其他客服");
		agreeTalk = false;
	});
	socket.on('reconnect', () => {
		if (username) {
			setUsername();
		}
	});
	socket.on('reconnect_error', () => {});
});
