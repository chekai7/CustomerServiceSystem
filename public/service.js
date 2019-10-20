$(function() {
	var socket = io('localhost:1880'); //連接node-red
	var $window = $(window);
	var $usernameInput = $('#usernameInput'); // Input for username
	var $customInput = $('#customInput'); //這是紀錄輸入姓名的input的內容
	var $loginPage = $('.login'); // The login page
	var $chatPage = $('.main_section'); // The chatroom page
	var $currentInput = $usernameInput.focus(); //對話框
	var allowSendmessage = false; //可以發言
	var confirmInRoom; //判斷選擇配對框(modal)是否有被關掉
	var cancelJoinRoom; //配對選擇框按下拒絕後，停止倒數計時
	var roomMate; //顧客傳送邀請時，送來的fata
	var targetName; //選擇的聊天室名字
	var countdownSec_slectBox; //選擇是否要跟客服配對框(modal)的倒數計時的秒數
	var repairRoom; //顧客的房間
	var username //客服姓名
	var targetRoom; //客服選擇要聊天的使用者房間
	var customerList = []; //目前配對到的顧客列表
	var userAgent = navigator.userAgent; //取得瀏覽器的userAgent字串
	var isOpera = userAgent.indexOf("Opera") > -1; //判斷是否Opera瀏覽器
	var isIE = userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1 && !isOpera; //判斷是否IE瀏覽器
	var isIE11 = userAgent.indexOf("rv:11.0") > -1; //判斷是否是IE11瀏覽器
	var isEdge = userAgent.indexOf("Edge") > -1 && !isIE; //判斷是否IE的Edge瀏覽器
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
	//判斷斷線
	if (!isIE && !isEdge && !isIE11) { //相容chrome和firefox
		var _beforeUnload_time = 0,
			_gap_time = 0;
		var is_fireFox = navigator.userAgent.indexOf("Firefox") > -1; //是否是火狐瀏覽器
		window.onunload = function() {
			_gap_time = new Date().getTime() - _beforeUnload_time;
			if (_gap_time <= 5) {//網頁直接被關閉
				allowCustomerChangeSTaff();//斷線通知顧客
			} else { //網頁重新整理
				allowCustomerChangeSTaff();//斷線通知顧客
			}
		}
		window.onbeforeunload = function() {
			_beforeUnload_time = new Date().getTime();
			if (is_fireFox) { //火狐關閉執行
				allowCustomerChangeSTaff()//斷線通知顧客
			}
		};
	}
	//罐頭訊息
	$("#dropdown-menu").delegate("li", "click", function(e) {
		let targetMessage = $(e.target).find('a').context.innerHTML;
		console.log("targetMessage:", targetMessage);
		newMessage = {
			username: username,
			message: targetMessage,
			userRoom: repairRoom,
			type: "staff",
			customname: cUsername,
		};
		socket.emit('new message', newMessage);
		console.log("傳送的訊息", newMessage);
		$('#Message').val('');
	});
	//發送訊息
	$("#sendMessage").click(function() {
		sendMessage();
		$('#Message').val('');
	});
	//離開聊天室
	$("#signout").click(function() {
		console.log("22");
		history.go(-1);
		allowCustomerChangeSTaff();
	});
	//蒐集顧客Info
	$("#customerInfo").click(function() {
		if ($('#name').val() != '' || $('#name').val() != '' || $('#name').val() != '') {
			$('#name').val('');
			$('#phone').val('');
			$('#eventType').val('');
			let getCustomerInfo = localStorage.getItem("recordCustomerInfo");
			console.log("getCustomerInfo:",getCustomerInfo);
		} else {
			alert("請將顧客資料填齊全");
		}
	});
	//confirm事件(接受顧客加入聊天室邀請)
	$("#confirmJoinChatroom").click(function() {
		console.log("confirm顧客進入聊天室");
		confirmInRoom = false;
		allowSendmessage = true;
    idleCount = 0;
		cUsername = roomMate.username;
		repairRoom = roomMate.repairRoom;
		customerList.push(repairRoom);
		console.log("customerList:", customerList);
		console.log("顧客房間號碼:", repairRoom);
		console.log("cUsername:",cUsername);
		updateStaffDb = {
			username: roomMate.staffid,
			match: "true", //判斷是否已經和顧客配對成功
			userRoom: repairRoom,
			type: "staff",
			cust: cUsername,
		}
		console.log("updateStaffDb:", updateStaffDb);
		socket.emit('confirmUserLogin', updateStaffDb); //讓使用者知道客服已經同意加入房間對話
		socket.emit('updatestaffOnlineDB', updateStaffDb); //更改客服在staffstatus表的狀態
		socket.emit('joinRoom', updateStaffDb);
		showCustomMenberlist(updateStaffDb);//在畫面左側呈現顧客list表
	});
	//cancel事件(拒絕顧客加入聊天室邀請)
	$("#cancelJoinChatroom").click(function() {
		confirmInRoom = false;
		cancelJoinRoom = true;
		countdownSec_slectBox = 10;
		idleCount = 0;
		console.log("roomMate", roomMate);
		socket.emit('refuseUserLogin', roomMate);
		dbcheckStaffOnline(); //找尋是否有其他客服上線
		changStaffStatus(username); //給客服十秒鐘的時間休息(十秒鐘後客服就會繼續自動上線)
	});
	//選擇對象聊天
	$('.member_list').delegate('li.left.clearfix', 'click', e => {
		targetRoom = $(e.target).find('strong').attr('id');
		console.log('$(e.target).', $(e.target));
		console.log("targetRoom:", targetRoom);
		$('.member_list').find(`#${targetRoom}`).css("background-color", "y  ellow");
		targetName = $(e.target).find('.primary-font').text();
		console.log("targetName:", targetName);
		repairRoom = targetRoom;
		var checkChatroomMessageLog = {
			target: targetRoom,
			log: "true" //此時是查看房間內的對話紀錄
		}
		socket.emit('checkStaffMessage', checkChatroomMessageLog);
		console.log('checkStaffMessage:', checkChatroomMessageLog);
		recordCustomerInfo(); //紀錄顧客資料
	})
	//紀錄顧客資料
	function recordCustomerInfo() {
		let name = $('#name').val();
		let phone = $('#phone').val();
		let eventType = $('#eventType').val();
		var checkChatroomMessageLog = {
			"targetRoom": targetRoom,
			"name": name,
			"phone": phone,
			"eventType": eventType
		}
		let recordCustomerInfo = JSON.stringify(checkChatroomMessageLog);
		localStorage.setItem("recordCustomerInfo", recordCustomerInfo);
	}
	//斷線通知顧客
	async function allowCustomerChangeSTaff() {
		for (var i = 0; i < customerList.length; i++) {
			let customer = await customerList[i];
			var deleteTable = {
				username: username,
				type: "staff",
				repairRoom: customer
			}
			console.log('disconnect1', deleteTable);
			socket.emit('disconnect1', deleteTable);
		}
		//customerList=[];
	}
	//客服的login狀態有分成四種，true、false、refused、decided
	//       其中，true=>客服在線上等待配對 or 客服已經和顧客成功配對
	//     			 false=>客服離線
	//refused、decided=>當顧客發送配對邀請時，此時會在該位客服的畫面顯示配對選擇框
	//	               此時客服的logi狀態為decided
	//                 按下確定是配對成功，這時候客服的login狀態為true；
	//                 按下取消 or 超過選擇配對限定時間(10秒) 則是配對失敗，
	//                 這時候客服的login狀態為refused，
	//
	//此時會給客服10秒鐘的緩衝時間休息，超過十秒後，客服的login狀態會改成true，讓客服繼續上線
	//
	function changStaffStatus(username) {
		setTimeout(function() {
			let staffOnlineMessage = {};
			staffOnlineMessage = {
				username: username,
				match: "false", //判斷是否已經和顧客配對成功
				userRoom: username,
				type: "staff",
				matchAgain: "true"
			};
			socket.emit('updatestaffOnlineDB', staffOnlineMessage);
		}, 10000);
	}
	//幫顧客找尋是否有其他客服上線
	function dbcheckStaffOnline() {
		console.log("dbcheckStaffOnline");
		socket.emit('checkStaffOnline_custom'); //確認是否有任何客服已在線
	}
	// 設置客服username
	function setUsername() {
		if (username) {
			$loginPage.fadeOut();
			$chatPage.show();
			$loginPage.off('click');
			let staffOnlineMessage = {};
			staffOnlineMessage = {
				username: username,
				type: "staff",
				userRoom: username,
				match: "false" //判斷是否已經和顧客配對成功
			};
			allowSendmessage = "notRepair";
			socket.emit('updatestaffOnlineDB', staffOnlineMessage); //更新客服在staffstatus資料表的login資訊
			socket.emit('joinRoom', staffOnlineMessage);
			console.log("staffOnlineMessage:", staffOnlineMessage);
		}
	}
	//發送訊息
	function sendMessage() {
		var message = $('#Message').val();
		if (message) {
			$('#Message').val('');
			newMessage = {
				username: username,
				message: message,
				userRoom: repairRoom,
				type: "staff",
				customname: cUsername
			};
			socket.emit('new message', newMessage);
			console.log("newMessage:", newMessage);
		}
	}
	//在畫面左側呈現顧客list表
	function showCustomMenberlist(data) {
		//取得現在時間
		var nowHour = new Date().getHours();
		var nowMinutes = new Date().getMinutes();
		let menber = $('<li>').addClass('left clearfix');
		let header_sec = $('<div>').addClass('header_sec');
		let name = $('<strong>').addClass('primary-font').text(data.cust).attr('id', repairRoom);
		let sendTime = $('<strong>').addClass('pull-right').text(nowHour + ":" + nowMinutes);
		header_sec.append(name, sendTime);
		let contact_sec = $('<div>').addClass('contact_sec');
		let cmessage = $('<strong>').addClass('primary-font1');
		contact_sec.append(cmessage);
		let chat_body_clearfix = $('<div>').addClass('chat-body clearfix');
		chat_body_clearfix.append(header_sec, contact_sec);
		menber.append(chat_body_clearfix);
		$('.member_list ul').append(menber);
	}
	//增加訊聊天聊天
	function addChatMessage(data, options) {
		console.log(data);
		var nowHour = new Date().getHours();
		var nowMinutes = new Date().getMinutes();
		let cmessages = data.message;
		console.log(targetName);
		console.log('repairRoom', repairRoom);
		$('.member_list').find(`#${repairRoom}`).parent().next().text(data.message);
		if (data.type == "staff") {
			let chatMessage = $('<div>').addClass('chat-body1 clearfix').css({
				'padding-left': '70%'
			});
			let recordChatTime = $('<div>').addClass('chat_time pull-left').text(nowHour + ":" + nowMinutes).css('margin-top', '9px')
			chatMessage.append(recordChatTime, `<p style="text-align:right;direction: ltr;margin-left :40px;margin-top: 5px;padding: 0px 10px;">  ${data.message}</p>`);
			$('.chat_area ul').addClass('left clearfix admin_chat').append(chatMessage).css("backgroundColor", "#ffffff")
		} else if (data.type == "custom" && data.username == targetName) {
			let chatMessage = $('<div>').addClass('chat-body1 clearfix')
			let ccmessage = $('<p>').css('margin-left', '20px').css('width', '15%').text(data.message)
			let recordChatTime = $('<div>').addClass('chat_time pull-right').css('margin-right', '73%').text(nowHour + ":" + nowMinutes)
			chatMessage.append(recordChatTime, ccmessage);
			$('.chat_area ul').addClass('left clearfix admin_chat').append(chatMessage).css("backgroundColor", "#ffffff")
			$('.chat-body clearfix > .contact_sec > strong').text(data.message);
		}
	}
	//在user的頁面顯示目前客服皆忙線中
	function changeState() {
		console.log("roomMate:", roomMate);
		socket.emit('repairFail', roomMate);
	}
	$window.keydown(event => {
		if (!(event.ctrlKey || event.metaKey || event.altKey)) {}
		if (event.which === 13) {
			username = $usernameInput.val();
			console.log(username);
			if (allowSendmessage == false) {
				socket.emit('checkStaffLoginRepeat', username) //查看是否登入重複帳號
			}
		}
	});
	//判斷帳號是否重複登入
	socket.on('staffMenberList', (data) => {
		console.log(data[0]);
		if (data[0].length != "") {
			alert("此帳號已經被登入過");
			$usernameInput.val("");
		} else {
			setUsername();
		}
	});
	//顧客邀請配對
	socket.on('roomMate', (data) => {
		console.log('roomMate', data);
		roomMate = data;
		cancelJoinRoom = false;
		confirmInRoom = true; //判斷選擇配對框(modal)是否有被關掉
		idleCount = 0; //計算閒置次數(客服沒做加進聊天室的選擇)，連續三次沒做選擇就會被系統強制登出離線
		countdownSec_slectBox = 10; //做出選擇的倒數時間
		$('#myModal').modal('show');
		//選擇框被關閉事件
		$('#myModal').on('hide.bs.modal', function(e) {
			console.log("confirmInRoom:", confirmInRoom);
			if (confirmInRoom == true) {
				setTimeout(function() {
					$('#myModal').modal('show');
				}, 500);
			}
		})
    //如果連續三次未做出選擇(加入/取消進入聊天室)，就直接將客服強制登出聊天室
      if(	idleCount >= 3){
        allowCustomerChangeSTaff();
      }
		$("#modal-body1").text("邀請    " + data.username + "    進入聊天室?");
		var interval = setInterval(function() {
			countdownSec_slectBox--;
			console.log("倒數秒數:", countdownSec_slectBox);
			$("h6").text(countdownSec_slectBox + "秒後就會停止配對");
			if (countdownSec_slectBox <= 0) {
				clearInterval(interval);
				confirmInRoom = false;
				idleCount++;
				socket.emit('recordStaffLazy', username); //讓客服的login狀態為idle
				dbcheckStaffOnline(); //找尋是否有其他客服上線
				changStaffStatus(username); //給客服十秒鐘的時間休息(十秒鐘後客服就會繼續自動上線)
				$('#myModal').modal('hide');
				countdownSec_slectBox = 10;
			} else if (allowSendmessage == true) {
				clearInterval(interval);
			} else if (cancelJoinRoom == true) {//客服選擇取消配對
				clearInterval(interval);
			}
		}, 1000);
		$("#cancelModal").click(function() {
			//當畫面出現是否要跟顧客配對的配對框(modal)時，一定要做決定，不能直接把配對框取消掉，
			//confirmInRoom=true =>此時會回到316行那邊，讓配對框再次顯示出來
			confirmInRoom = true;
		});
	});
	// new message事件
	socket.on('new message', (data) => {
		console.log('new message', data);
		addChatMessage(data);
	});
	//查看對話紀錄，顯示在聊天室裡面
	socket.on('checkMessage_customerName', (data) => {
		console.log('checkMessage_customerName', data[0]);
		$(".chat-body1.clearfix").remove();
		for (let q = 0; q < data[0].length; q++) {
			let dbSendtime = JSON.parse(data[0][q].sendTime);
			let nowHour = new Date(dbSendtime).getHours();
			let nowMinutes = new Date(dbSendtime).getMinutes();
			if (data[0][q].type == "staff") {
  				let chatMessage = $('<div>').addClass('chat-body1 clearfix').css({
  					'padding-left': '70%'
  				});
  				let recordChatTime = $('<div>').addClass('chat_time pull-left').text(nowHour + ":" + nowMinutes).css('width', '50%').css('margin-top', '9px')
  				chatMessage.append(recordChatTime, `<p style="text-align:right;margin-left :40px;margin-top: 5px;padding: 0px 10px;">  ${data[0][q].messages}</p>`);
  				$('.chat_area ul').addClass('left clearfix admin_chat').append(chatMessage).css("backgroundColor", "#ffffff")
			} else if (data[0][q].type == "custom") {
  				let chatMessage = $('<div>').addClass('chat-body1 clearfix')
  				let ccmessage = $('<p>').css('margin-left', '20px').css('width', '15%').text(data[0][q].messages)
  				let recordChatTime = $('<div>').addClass('chat_time pull-right').css('margin-right', '73%').text(nowHour + ":" + nowMinutes)
  				chatMessage.append(recordChatTime, ccmessage);
  				$('.chat_area ul').addClass('left clearfix admin_chat').append(chatMessage).css("backgroundColor", "#ffffff")
			}
		}
	});
	//查看是否有其他客服上線
	socket.on('staffOnlineList', (data) => {
		console.log('staffOnlineList', data[0]);
		console.log("roomMate:",roomMate);
		//如果沒有客服上線
		if (data[0].length === 0) {
			console.log("目前無客服可配對");
			changeState(); //在user的頁面顯示目前客服皆忙線中
		} else {
			//有客服上線
			var staff_match_count_min = data[0].filter(function(item, index, array) {
				//找出配對次數最少的員工
				let number = Math.min(...data[0].map(p => p.macth_count));
				return item.macth_count == number;
			});
			number = staff_match_count_min[0].staffName;
			if (staff_match_count_min.length >= 1) {
				let randomNumber = Math.floor(Math.random() * staff_match_count_min.length);
				number = staff_match_count_min[randomNumber].staffName;
			}
			console.log("staff_match_count_min:",staff_match_count_min);
			repairStaffName = number;
			//如果同時有多位員工配對次數都一樣(最少)，隨機選一名客服作配對
			console.log("repairStaffName:",repairStaffName);
			console.log("roomMate:",roomMate);
			var changestaff = {
				username: roomMate.username,
				type: roomMate.type,
				staffid: repairStaffName,
				userRoom: roomMate.userRoom
			}
			console.log("changestaff:",changestaff);
			socket.emit('decideUserLogin', changestaff); //幫顧客問其他已經上線的客服是否有空可以配對
		}
	});
	socket.on('customDisconnect', (data) => {
		console.log('customDisconnect', data);
		$('ul .list-unstyled').find('.header_sec').css("background-color", "yellow");
		$('.member_list').find(`#${data.repairRoom}`).after("(已離線)").css("background-color", "yellow");
	});
	socket.on('disconnect', (data) => {
		console.log('disconnect', data);
    allowCustomerChangeSTaff();
	});
});
