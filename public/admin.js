$(function() {
	var onlineStaus;//客服上線狀態
	var touchStaffname;//查看客服對話紀錄時，所點擊的客服名字(button)
	var chooseName;//查看該位客服對話紀錄時，所點擊的顧客名字(button)
	var show = false;//允許顯示客服上線情形
	var messagerecord;//記錄所有的客服對話內容
	var staffList;//選擇要查看的客服
	var socket = io('localhost:1880');
	$('Table#test').hide();
	$('Table#customMenber').hide();
	$('#messageRecord ').hide();
	$('#custSuggestion').hide();
	$('#staffList ').hide();
	$('#suggestionCustomer').hide();
	$("#adminInput").keydown(function(event) {
		if (event.which == 13) {
			if ($("#adminInput").val() == "q") {
				socket.emit('checkStaffOnline_Admin');//查詢目前客服上線情況
				$('Table#test').show();
				$('Table#customMenber').hide();
				$('#staffList').hide();
				$('#messageRecord').show();
				$('#custSuggestion').show();
				show = true;
			} else {
				$('#messageRecord ').hide();
				$('#custSuggestion ').hide();
				$("#test tbody").html("");
				$('Table#test').hide();
				$('Table#customMenber').hide();
				alert("密碼錯誤");
				show = false;
			}
			$("#adminInput").val("");
		}
	});
	$('#messageRecord').click(function() {
		$('Table#test').hide();
		$('#staffList').show();
		$('Table#suggestionCustomer').hide();
	});
	$('#custSuggestion').click(function() {
		$('Table#test').hide();
		$('#staffList').hide();
		$('#suggestionCustomer').text("");
		$('#customMenber').hide();
		socket.emit('checkSuggestion');
	});
	$("#adminInput").click(function() {
		if (show == true) {
			socket.emit('checkStaffOnline_Admin');//查詢目前客服上線情況
			console.log(show);
			$('Table#test').show();;
			$('#staffList').hide();
			$('#customMenber').hide();
			$('#suggestionCust').hide();
		}
	});
	$('#staffList').change('selectmenuchange', function() {
		 staffList = $(this).val();
		console.log(staffList);
		if (staffList != "員工列表") {
			var checkChatroomMessageLog={
				log:"false"  //此時是選擇要查看的客服對話紀錄
			}
			socket.emit('checkStaffMessage',checkChatroomMessageLog);
		}
	});
	$('#customMenber').on('click', "td", function(e) {
		console.log($(this).text());
		console.log(messagerecord);
		var chooseName = JSON.parse($(this).text());
		$('#myModal').modal("show");
		$('#suggestionCustomer').hide();
		$('table#messageRecord1').text(""); // $('tbody  tr:last').remove();
		$('#messageRecord1').append(`<tr><th>時間</th><th>姓名</th><th>對話內容</th></tr>`);
		console.log(chooseName);
		console.log(staffList);
		var staff_custom_message_record = messagerecord.filter(function(item, index, array){
			return item.sender == chooseName &&item.receiver==staffList ||
							item.receiver == chooseName &&item.sender==staffList;
		});
		console.log(staff_custom_message_record);
		for (var q = 0; q < staff_custom_message_record.length; q++){
			var num = JSON.parse(staff_custom_message_record[q].sendTime);
			var sendDate = new Date(num);
			var months = "1,2,3,4,5,6,7,8,9,10,1,12".split(",");
			var timeNow = months[sendDate.getMonth()] + "/" + sendDate.getDate() + "  " + sendDate.getHours() + ":" + sendDate.getMinutes()+":"+sendDate.getSeconds();
			console.log(timeNow);
				$('#messageRecord1').append(`<tr><td>${timeNow}</td><td>${staff_custom_message_record[q].sender}</td><td>${staff_custom_message_record[q].messages}</td></tr>`);

		}
	});

	//陳列顧客的意見
	socket.on('output_checkSuggestion', (data) => {
		console.log('output_checkSuggestion',data[0]);
			$('#suggestionCustomer').show();
		$('#suggestionCustomer').append(`<tr><th>時間</th><th>顧客の姓名</th><th>客戶の姓名</th><th>滿意度調查表(1~10)</th><th>聯絡資訊</th><th>顧客建議</th></tr>`);
		for (var q = 0; q <data[0].length; q++) {
			var num = JSON.parse(data[0][q].loginTime);
			var sendDate = new Date(num);
			console.log(sendDate.toString() + "<br />")
			var months = "1,2,3,4,5,6,7,8,9,10,1,12".split(",");
			console.log(months[sendDate.getMonth()] + "/" + sendDate.getDate() + "  " + sendDate.getHours() + ":" + sendDate.getMinutes());
			var timeNow = months[sendDate.getMonth()] + "/" + sendDate.getDate() + "  " + sendDate.getHours() + ":" + sendDate.getMinutes();
			$('#suggestionCustomer').append(`<tr><td>${timeNow}</td><td>${data[0][q].customName}</td>
      <td>${data[0][q].staffName}</td><td>${data[0][q].score}</td><td>${data[0][q].contact}</td><td>${data[0][q].note}</td></tr>`);
		}
	});
	//查詢該位顧客的聊天(服務)對象
	socket.on('checkMessage_customerName', (data) => {
		// messagerecord=data[0];
		console.log('checkMessage_customerName',data[0]);
	 var messagerecordlist = data[0].filter(function(item, index, array){
			  return item.sender ==staffList || item.receiver ==staffList;
		});
		console.log(messagerecordlist);
		messagerecord=messagerecordlist
		if (messagerecordlist == "") {
			$('Table#customMenber').hide();
			alert("沒有對話紀錄資料");
		} else {
			var findMessageReceiver =messagerecord.map(function(item, index, array) {
				return item.sender;
			});
			//從陣列取出不重複的值
			var result = [...(new Set(findMessageReceiver))];
			console.log(result,findMessageReceiver);
			//若有超過一位以上的顧客對話紀錄，則會條列式的用表格顯示顧客名字
			$('Table#customMenber').show();
			$('Table#customMenber').text("");
			$('#customMenber').append(`<tr><th>對話紀錄表</th></tr>`);
			for (var q = 0; q < result.length; q++) {
				if(result[q]!=staffList){
					$('#customMenber').append(`<tr><td>"${result[q]}"</td></tr>`);
				}else if (result[q]==staffList && result.length==1 ) {
					$('#customMenber').append(`<tr><td>"${messagerecord[0].receiver}"</td></tr>`);
				}
			}
		}
	});
	//查詢員工上線狀態
		socket.on('onlineList', (data) => {
		console.log('onlineList',data[0]);
		//員工列表
		$("#staffList").text("");
		$("#staffList").append(`<option value="員工列表">員工列表</option>`);
		var staffMember = data[0].forEach(function(item, index, array) {
			$("#staffList").append(`<option value=${item.staffName}>${item.staffName}</option>`);
		});
		$("#test tbody").html("");
		//已經連線
		var successMatch = data[0].filter(function(item, index, array) {
			return item.login == 'true' && item.customer != "";
		});
		console.log(successMatch);
		if (successMatch != "") {
			for(let q = 0; q < successMatch.length; q++) {
				if (successMatch[q].login == "true"||successMatch[q].login == "refused"||successMatch[q].login == "idle") {
					onlineStaus = "連線中";
				}
				console.log(onlineStaus);
				$('tbody#connect').append(`<tr><td>${successMatch[q].staffName}</td><td>${onlineStaus}</td>
        <td>${successMatch[q].customer}</td><td>${successMatch[q].matchTimes }</td><td>${successMatch[q].lazy}</td></tr>`);
			}
		}
		//等待配對
		var waitRepair = data[0].filter(function(item, index, array) {
			return item.login == 'true' && item.customer == "";
		});
		console.log(waitRepair);
		if (waitRepair != "") {
			for (let q = 0; q < waitRepair.length; q++) {
				if (waitRepair[q].login == "true") {
					onlineStaus = "等待中";
				}
				console.log(onlineStaus);
				$('tbody#waitRepair').append(`<tr><td>${waitRepair[q].staffName}</td><td>${onlineStaus}</td>
        <td>${waitRepair[q].customer }</td><td>${waitRepair[q].matchTimes }</td><td>${waitRepair[q].lazy }</td></tr>`);
			}
		}
		//離線中
		var offline = data[0].filter(function(item, index, array) {
			return item.login == 'false';
		});
		console.log(offline);
		if (offline != "") {
			for (var q = 0; q < offline.length; q++) {
				if (offline[q].login != "true") {
					onlineStaus = "離線";
				}
				if (offline[q].customer == "") {
					customer = "";
				}
				console.log(onlineStaus);
				$('tbody#offline').append(`<tr><td>${offline[q].staffName}</td><td>${onlineStaus}</td>
        <td>${customer}</td><td>${offline[q].matchTimes }</td><td>${offline[q].lazy }</td></tr>`);
			}
		}
	});

});
