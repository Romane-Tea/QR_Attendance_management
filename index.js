<script>
meibo_data ="";           //名簿シート全体
address_data = [];        //名簿シートの氏名とアドレス一覧
scanQRData_data ="";      //スキャンしたデータ全体
record_sheet_first = [];  //記録シートの初日
on_date ="";              //現在日時を収納する変数
on_time = "";             //現在時刻を収納する変数
qr_text = "";             //スキャンしたテキスト内容
at_work = "4:00";         //出勤扱いにする開始時間
leav_work = "12:40";      //退勤扱いにする開始時間
read_after_time = 5;      //退勤処理になるまでの時間　単位：分
wait_time = 3;            //読みこんだ結果を表示する時間　単位：秒
SHEET_NAME = 'ScanQRData';

//最初に実行
document.addEventListener('DOMContentLoaded', function () {
  start_html();
}, false);

async function start_html() {
  meibo_data = await get_sheet_data("名簿");  //名簿シート全体のデータを取得
  scanQRData_data = await get_sheet_data("ScanQRData");  //ScanQRDataシート全体のデータを取得
  
  school_name = meibo_data[0][9];     //学校名を読み込む
  nendo =  meibo_data[1][9];          //年度を読み込む
  read_after_time = meibo_data[3][9]; //退勤処理になるまでの時間　単位：分
  wait_time = meibo_data[4][9];       //読みこんだ結果を表示する時間　単位：秒
  info = meibo_data[5][9];            //表示する情報を読み込む
  at_work = meibo_data[6][9].split(':');  //出勤開始時間のデータ
  leav_work =meibo_data[7][9].split(':'); //退勤開始時間のデータ
  record_sheet_first =meibo_data[8][9];// 記録シートの初日
  record_day_first = new Date(record_sheet_first.split('/')[0],record_sheet_first.split('/')[1]-1,record_sheet_first.split('/')[2]); //日付データに変換
  // 名簿からアドレス一覧を取得、行列化
  for (let i = 1; i<meibo_data.length ; i++){
    if (meibo_data[i][1] ==""){}else{
      let meibo = ["",""];
      meibo[0] = meibo_data[i][1];
      meibo[1] = meibo_data[i][2];
      address_data[i] = meibo;
    } 
  }

  //表示テキストを設定する
  let school_name_text = document.getElementById('school');
  school_name_text.innerText = nendo +"年度 "+school_name + "　在校時間管理システム (" +on_date+on_time+"起動)";
  let info_text = document.getElementById('info');
  info_text.innerText = info;

  // school_name_text.classList.remove('loader');

  debug_append(on_date+on_time_s+"起動");
  console.log("address_data=",address_data);
  console.log("scanQRData_data=",scanQRData_data);
  console.log("at_work=",at_work);
  console.log("leav_work=",leav_work);
  console.log("record_sheet_first=",record_sheet_first);
  console.log("record_day_first=",record_day_first);
  qr_text = "QRコードを読み込めます";
  append(qr_text);
  console.error("起動完了");
}
// シート名からデータを読み込む関数（コードスクリプトの読み込み）
function get_sheet_data(sheet_name,row,col) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler((result) => resolve(result))
      .withFailureHandler(function(error) {
        append("<a class='read_ok'>シートにアクセスできません。管理者に問い合わせ、Googleに再ログインしてもらってください。<br>その間は、記録できませんので、ご了承ください。</a>");
        debug_append("シートにアクセスできません。管理者に問い合わせ、Googleに再ログインしてもらってください。");
        const reader = document.getElementById('reader');
        reader.remove();
        clearInterval(reload_sheet);
        reject(error);
        return;
      })
      .GetSpreadsheet(sheet_name,row,col);
  });
}

//////// QRコードの関数 //////////
let CURRENT_CODE = '';
let config = {
  fps: 10,
  qrbox: {width: 250, height: 250},
  rememberLastUsedCamera: true,
  // Only support camera scan type.
  supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
};
let html5QrcodeScanner = new Html5QrcodeScanner("reader", config ); //{ fps: 50, qrbox: 250});

let QRresult = document.querySelector('#result');
const append = (decodedText) => {
      QRresult.innerHTML = `${decodedText}<br>`; 
};

const onScanSuccess = (decodedText) => {
  onScan_OK(decodedText);
  };

html5QrcodeScanner.render(onScanSuccess);

//読取り成功時の処理
const onScan_OK = async function(decodedText){
  if (CURRENT_CODE !== decodedText) { //連続読み取り防止
    CURRENT_CODE = decodedText;

    //音を鳴らす処理
    try{audio.play();}catch(e){console.log("音が鳴りません");}

    let shouldPauseVideo = true;
    html5QrcodeScanner.pause(shouldPauseVideo);   //ビデオを一時停止します

    let now_qr_time = new Date();       //QR読み込み時の日時を作成
    let temp_time = new Date(JSON.parse(JSON.stringify(now_qr_time)));  //now_qr_timeをディープコピーする
    if (now_qr_time.getHours()<Number(at_work[0])){
      temp_time.setDate(temp_time.getDate()-1);   //もし0時から出勤開始時間前なら、前日を設定する
    }
    
    let at_work_today = new Date(temp_time.setHours(Number(at_work[0]),Number(at_work[1]),0,0));        //出勤扱い開始時間を設定
    let leav_work_today = new Date(temp_time.setHours(Number(leav_work[0]),Number(leav_work[1]),0,0));  //退勤扱い開始時間を設定
    console.log("出退勤時間",at_work_today,leav_work_today);
    let address_now = address_data.map((e, index) => [e, index]).filter(([e, index]) => e[1] == decodedText);  //アドレス一覧から該当するデータを抽出  [0]:名前 [1]:アドレス
    let qr_result = [];
  
    // scanQRDataシートから、勤務開始時間後の日付のデータを抽出する
    for (let index=0; index<scanQRData_data.length; index++){
      let index_date = new Date(scanQRData_data[index][0]); //QRシートの読み込み日時データ
      if(index_date.getTime() >= at_work_today.getTime() && scanQRData_data[index][1] == decodedText){
        qr_result.push([scanQRData_data[index],index]);
      }
    }
    
    let day_first_4 = record_day_first.setHours(Number(at_work[0]),Number(at_work[1]), 0, 0);
    let magin = now_qr_time.getTime() - day_first_4;
    let diffDay = Math.floor(magin / (1000 * 60 * 60 * 24));        //記録シートの初日からの差分を取得
    let write_row = diffDay+4;
    console.log("now_qr_time",now_qr_time);
    console.log("qr_result=",qr_result);

    //該当するアドレスがない時
    if (address_now ==""){
      console.log("該当なし処理");
      qr_text = "<a class='read_ok'>" + on_time + "<br>" + decodedText +"<br> は登録されていません。<br>管理者に問い合わせてください。</a>";
      append(qr_text);
      debug_append(on_time_s+" 該当なし処理 "+decodedText);
      await sleep( wait_time*1000 );
      qr_text = "QRコードを読み込めます"+Srtring(qr_result);
      append(qr_text);
      await sleep(wait_time * 1000);
      append("QRコードを読み込めます");
      return;
    }
    let now_name = (String(address_now)).split(',')[0];   //名前を取得
    console.log("now_name=",now_name);
    //出勤時
    if (qr_result.length ==0) {
      console.log("length=0");
      // 0時から4時までの間は退勤扱い
      console.log("at_work_today.getTime() , now_qr_time.getTime()",at_work_today.getTime() , now_qr_time.getTime());
      if (at_work_today.getTime() > now_qr_time.getTime()){
        console.log("0時から4時までの間は退勤扱い");
        await taikin(decodedText,now_name,now_qr_time,address_now,write_row);
        await sleep(wait_time * 1000);
        append("QRコードを読み込めます");

      // 午後の時間を過ぎて出勤になったとき
      } else if (leav_work_today.getTime() <  now_qr_time.getTime()){
        console.log("出勤記録を忘れた可能性があるときの扱い");
        //出勤記録を忘れた可能性があるときの扱い

        //モーダルウインドウの処理
        modal_open_time = Date.now();
        modal_open();
        let m_i = 4;
        const countDown = setInterval(function(){
          document.getElementById("modal-footer").innerHTML = "<h3>"+ m_i +"秒後に自動で退勤扱いで閉じます。</h3>";
          m_i = m_i-1;
          console.log(m_i);
        },1000);    //時計動作開始
        const timeId = setTimeout(async function(){
          close.onclick();
          clearTimeout(timeId);
          clearInterval(countDown);
          if ( Date.now() - modal_open_time >= m_i*1000 +1000){
            await taikin(decodedText,now_name,now_qr_time,address_now,write_row);
            await sleep(wait_time * 1000);
            append("QRコードを読み込めます");
          }
        },m_i*1000 +1000);


        //出勤処理　or 退勤処理
        document.getElementById("leave_work").addEventListener("click", async function() {
          // 退勤ボタンがクリックされた時の処理
          close.onclick();
          clearTimeout(timeId);
          clearInterval(countDown);
          await taikin(decodedText, now_name, now_qr_time, address_now, write_row);
          await sleep(wait_time * 1000);
          append("QRコードを読み込めます");
        });

        document.getElementById("at_work").addEventListener("click", async function() {
          // 出勤ボタンがクリックされた時の処理
          close.onclick();
          clearTimeout(timeId);
          clearInterval(countDown);
          await syukkin(decodedText, now_name, now_qr_time, address_now, write_row);
          await sleep(wait_time * 1000);
          append("QRコードを読み込めます");
        });

      } else {
        //出勤処理
        console.log("出勤処理ノーマル");
        await syukkin(decodedText,now_name,now_qr_time,address_now,write_row);
        await sleep(wait_time * 1000);
        append("QRコードを読み込めます");
      }

    //重複処理 出勤のみ入力されているとき
    //退勤時
    } else if (qr_result.length ==1){
      console.log("length=1");
      let qr_time = new Date(qr_result[0][0][0]); //出勤時刻を取得
      let state = qr_result[0][0][2]; //出退勤の状態を取得

      if (state =="出勤"){
        //5分以内なら
        if (now_qr_time.getTime() - qr_time.getTime() < read_after_time*60*1000){
          console.log("出勤済み処理");
          qr_text = "<a class='read_ok'>" + now_name +"<br> 出勤済みです</a>";
          append(qr_text);
          debug_append(on_time_s+" 出勤済み処理 "+now_name+decodedText);
          await sleep( wait_time*1000 );
          qr_text = "QRコードを読み込めます";
          append(qr_text);

        //5分以上経っていたら
        } else {
          console.log("退勤処理");
          await taikin(decodedText,now_name,now_qr_time,address_now,write_row);
          await sleep(wait_time * 1000);
          append("QRコードを読み込めます");
        }
      } else if (state =="退勤"){
        //退勤上書き処理
        await taikin_update(decodedText,qr_result[0],now_name,now_qr_time,address_now,write_row);
        await sleep(wait_time * 1000);
        append("QRコードを読み込めます");
      }

    //退勤まで入力されているとき 退勤時間の上書き
    } else if (qr_result.length ==2) {
      //退勤上書き処理
      await taikin_update(decodedText,qr_result[1],now_name,now_qr_time,address_now,write_row);
      await sleep( wait_time*1000 );
      append("QRコードを読み込めます");
    }
  }
  //　ビデオを再開します。もし、resumeが関数でないときは、メッセージを表示します。（タイミングが悪いと…）
  if (typeof html5QrcodeScanner.resume === 'function') {
    html5QrcodeScanner.resume();
  } else {
    append('html5QrcodeScanner does not have a play method');
  }
}

const syukkin = async function(decodedText, now_name, now_qr_time, address_now, write_row) {
  let add_data = [now_qr_time, (String(address_now)).split(',')[1]];
  qr_text = "<a class='read_ok'>ただいま出勤処理中です。<br>そのままお待ちください。 </a>";
  append(qr_text);
  debug_append(on_time_s+" 出勤処理開始 "+now_name+decodedText);
  // 読取り成功時にスプレッドシートにデータを書き込む非同期関数
  const writeToSpreadsheet  = () =>  {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(function() {
          append("<a class='read_ok'>" + on_time + " " + now_name + " 出勤しました</a>");
          debug_append(on_time_s+" 出勤処理完了 "+now_name+decodedText);
          scanQRData_data.push(add_data);
          resolve();
        })
        .withFailureHandler(function(error) {
          append("<a class='read_ok'>" +`"${decodedText}"を保存できませんでした。すぐに管理者に報告してください。: ${error}`+"</a>");
          debug_append(on_time_s+" 出勤処理エラー "+now_name+decodedText);
          const reader = document.getElementById('reader');
          reader.remove();
          reject(error);
        })
        .onScan(decodedText, "出勤", write_row, address_now[0][1]);
    });
  };
  // スプレッドシートに書き込んだ後、待機する
  await writeToSpreadsheet();
};

const taikin = async function(decodedText,now_name,now_qr_time,address_now,write_row){
  qr_text = "<a class='read_ok'>お疲れ様です。ただいま退勤処理中です。<br>そのままお待ちください。 </a>";
  append(qr_text);
  debug_append(on_time_s+" 退勤処理開始 "+now_name+decodedText);
  console.log("退勤処理1");
  let add_data = [now_qr_time,(String(address_now)).split(',')[1]];
  // 読取り成功時にスプレッドシートにデータを書き込む非同期関数
  const writeToSpreadsheet  = () => {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(function(){
          append("<a class='read_ok'>" + now_name +"<br> 退勤しました。お疲れ様です。</a>");
          debug_append(on_time_s+" 退勤処理完了 "+now_name+decodedText);
          scanQRData_data.push(add_data);
          resolve();
          })
        .withFailureHandler(function (error) {
          append("<a class='read_ok'>" +`"${decodedText}"を保存できませんでした。すぐに管理者に報告してください。: ${error}`+"</a>");
          debug_append(on_time_s+" 退勤処理エラー "+now_name+decodedText);
          const reader = document.getElementById('reader');
          reader.remove();
          reject(error);
          })
        .onScan(decodedText,"退勤",write_row, address_now[0][1]);
    });
  };
  // スプレッドシートに書き込んだ後、待機する
  await writeToSpreadsheet();
}

const taikin_update = async function(decodedText,qr_result,now_name,now_qr_time,address_now,write_row){
  qr_text = "<a class='read_ok'>お疲れ様です。ただいま退勤上書き処理中です。<br>そのままお待ちください。 </a>";
  append(qr_text);
  debug_append(on_time_s+" 退勤上書き処理開始 "+now_name+decodedText);
  console.log("退勤上書き処理");
  let qr_index = qr_result[1];   //行番号を取得（最初が0)
  let add_data = [now_qr_time,(String(address_now)).split(',')[1]];
  //読取り成功時にスプレッドシートにデータを書き込む
  const writeToSpreadsheet  = () => {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(function(){
          append("<a class='read_ok'>" + now_name +"<br> 退勤時間を更新しました。お疲れ様です。</a>");
          debug_append(on_time_s+" 退勤上書き処理開始完了 "+now_name+decodedText);
          scanQRData_data[qr_index] = add_data;
          resolve();
          })
        .withFailureHandler(function (error) {
          append("<a class='read_ok'>" +`"${decodedText}"を保存できませんでした。すぐに管理者に報告してください。: ${error}`+"</a>");
          debug_append(on_time_s+" 退勤上書き処理エラー "+now_name+decodedText);
          const reader = document.getElementById('reader');
          reader.remove();
          reject(error);
          })
        .onScan_rewrite(qr_index, decodedText, now_name, write_row, address_now[0][1]);
    });
  };
  // スプレッドシートに書き込んだ後、待機する
  await writeToSpreadsheet();
}

let modal = document.getElementById('modal_window');
let debug = document.getElementById('debug_window');
let close = modal.getElementsByClassName('close')[0];
let close_debug = debug.getElementsByClassName('close')[0];

// 読み込み時モーダルウィンドウを表示する
function modal_open() {
  modal.style.display = 'block';
  setTimeout(function(){modal.style.display = 'none';}, 5000);
};
// 'X'を押したらモーダルウィンドウを閉じる
close.onclick = function() {
  modal.style.display = 'none';
};
// 'X'を押したらdebugウィンドウを閉じる
close_debug.onclick = function() {
  debug.style.display = 'none';
};
function nowTime(times){ // 年月日に整えます
  let year = times.getFullYear(); // timesから年を取り出す
  let month = times.getMonth()+1; // timesから月を取り出す
  let date = times.getDate();     // timesから日付を取り出す
  let hour = times.getHours();    // timesから時間を取り出す
  let minute = times.getMinutes(); // timesから分を取り出す
  let second = times.getSeconds();  // timesから秒を取り出す
  let re_time = year + "年" + month + "月" + date + "日" + hour + "時" + minute + "分" + second + "秒";
  return re_time;
}
const sleep = waitTime => new Promise( resolve => setTimeout(resolve, waitTime) );

//////// 時計表示の関数 ////////
setInterval(showClock1,1000);    //時計動作開始
setInterval(function(){CURRENT_CODE = "";},30000);  //5分で再読み込み用のデータを消去
//6時間ごとに再読み込みする
setInterval(function(){reload_now();},6*60*60*1000);

function showClock1() {
  var nowTime = new Date();
  var nowYear = nowTime.getFullYear();
  var nowMonth = nowTime.getMonth()+1;
  var nowDateA = nowTime.getDate();
  var nowDay = nowTime.getDay();
  var dayOfWeekStr = [ "日", "月", "火", "水", "木", "金", "土" ][nowDay] ;	// 曜日(日本語表記)
  var nowHour = nowTime.getHours();
  var nowMin  = nowTime.getMinutes().toString().padStart(2, '0');
  var nowSec  = nowTime.getSeconds().toString().padStart(2, '0');
  on_date = nowMonth +"月" + nowDateA +"日 ";
  on_time = nowHour + ":" + nowMin ;
  on_time_s = nowHour + ":" + nowMin +":"+ nowSec ;
  var time_now = nowYear + "年" + nowMonth +"月" + nowDateA +"日("+ dayOfWeekStr + ")<br><a class='time'>" + nowHour + ":" + nowMin + ":" + nowSec + "</a>";
  document.getElementById("clock").innerHTML = "現在は、" + time_now;
}

//指定時間に自動で再読み込みをする
function reloadAtSpecificTime(hour, minute) {
  const now = new Date();
  const reloadTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);

  if (now > reloadTime) {
      // すでに指定の時刻を過ぎている場合、翌日の同じ時刻に再読み込みをスケジュールする
      reloadTime.setDate(reloadTime.getDate() + 1);
  }
  const timeUntilReload = reloadTime - now;
  setTimeout(function() {
      reload_now();
  }, timeUntilReload);
}

// 4時01分に再読み込みをスケジュールする
reloadAtSpecificTime(4, 1);

//音を鳴らすための仕掛け
let audio = null;
document.getElementById("audio").addEventListener ('click', () => {
  audio = new Audio("data:audio/wav;base64," + base64);
  document.getElementById("audio").innerText = "音が鳴ります";
  console.log("クリックされました");
},100);

async function reload_now() {
  append('情報を再取得中');
  await start_html();
  append('QRコードを読み込めます。');
}

// グローバル変数
var tapCount = 0 ;

// <div id="info">...</div>などの要素にタッチイベントを設定
document.getElementById( "info" ).addEventListener( "touchstart", function( e ) {
	// シングルタップの場合
	if( !tapCount ) {
		// タップ回数を増加
		++tapCount ;
    console.log( "タップに成功しました!!" ) ;
		// 500ミリ秒だけ、タップ回数を維持
		setTimeout( function() {tapCount = 0 ;}, 500 );
	// ダブルタップの場合
	} else {
		// ビューポートの変更(ズーム)を防止
		e.preventDefault() ;
    debug_open();
		// ダブルタップイベントの処理内容
		console.log( "ダブルタップに成功しました!!" ) ;
		// タップ回数をリセット
		tapCount = 0 ;
	}
} ) ;

// debugウィンドウを表示する
function debug_open() {
  debug.style.display = 'block';
};

function debug_append(text){
  let p = document.getElementById('debug_text');
  let text_d =p.innerHTML;
  console.log("debug",text_d,text);
  let text_d2 = text_d+"<br>"+text;
  p.innerHTML = text_d2;
}

function debug_copy(){
  let p = document.getElementById('debug_text');
  let text_d =p.innerText;
  console.log("debug_copy",text_d);
  copyToClipboard(text_d);
}
// クリップボードへコピー（コピーの処理）
function copyToClipboard (textValue) {
  textValue.replace('<br>','\n');
  if (navigator.clipboard) { // navigator.clipboardが使えるか判定する
    return navigator.clipboard.writeText(textValue).then(function () { // クリップボードへ書きむ
    })
  } else {
    let tagText = document.getElementById('debug_text');
    tagText.select() // inputタグを選択する
    document.execCommand('copy') // クリップボードにコピーする
  }
}

//以下、読み込み時の音データ
base64 = 'UklGRiQQAQBXQVZFZm10IBAAAAABAAIAgLsAAADuAgAEABAAZGF0YQAQAQD///7/' +
'/f/+//v//v/9//3//////////v/9/////f8BAAAA//8AAP7//f8AAP7//v/9//7/' +
'/f///wAA/f/+//3//v/+/////v/9/wAA//8AAAAA/v/9//7//f////z//v/8//7/' +
'/f/8//z/+//9//3//f/9//7//f8AAP////8AAP//AAABAP7////8//z////9////' +
'/v/9/////P/+//7//P8AAP///f8AAPr//f/9//3//v/+//3////9//7//v/8////' +
'/f////3/AAAAAP//AgD+////AQD+/wEAAAD+/////v/+//3/+/////z/AAAAAP7/' +
'//8BAP//AgABAP/////+//7//v/9//3//f/9/////f8AAP3/AAD+/wAA/v/9////' +
'/f/+//3//f/8//7//v/9//7//v8AAP7/AAD+//7/AAD9/////v/8/////f////3/' +
'/v/+//3/AAD/////AQD+/wAA/v////3/AAD9/////v////7////9//3//v/9//7/' +
'/v/+//7////9/wAA//8BAP//AQD//wAA///+/////v/+//7//v/9//3////+//7/' +
'AAD9//7/AQAAAAEAAQD+///////+/////f/+//3//v/9//3/+v8AAP7/AAABAP7/' +
'/////////////wAA///+/////v/+/wAA/v///wAA/f////3//f/+//////8AAP3/' +
'///7//3//P/9//v/+//6//v/+v/8//v/+////////f8AAPv////+////AAD8/wAA' +
'/f8AAAEAAAD//wAA/v8AAAEAAgD//wIA/f/+//7/AAD//wIAAQABAAIAAgADAAMA' +
'AwACAAEAAAD9//7//f/9/wEA/v//////+f/+//r/+//9//3////9/wAA/v/+//7/' +
'AAD+/wEAAQD//wEA///+/wIAAgABAAQA/P/+//n/9//6//f//f/9///////9//7/' +
'/f8AAAAAAQAAAP//AQACAAMABgAAAAEA/f/6//3//P//////AAD9/wAA/f8AAP3/' +
'/////wAA///7//r/+P/5/////v8CAAEA/v////7//v////7//v/8/wAA/f8CAAIA' +
'AAD///n/+v/2//b/+//6////AQD9//7//P/7/wAA/v8AAAEA+/8BAP7/AAABAAIA' +
'/f8DAPr//v/0//f/9v/1//z/+v/5//v/9f/1//X/9v/2//f/+P/0//j/+f/7//v/' +
'/f/9//z/AQD7//z/+//6/wEAAwABAAEA+f/8//3///8CAAMA//8AAAEAAQAGAAcA' +
'CAAHAAgACAAGAAoABAAGAAAAAQD8//7//P/8//3//v/6//z/+P/4//r/+//7//7/' +
'+v/6//n/+f/4//n/+f/5//3/+f/9//v//f/+/wEAAQABAP/////+/wQAAwAFAAUA' +
'AAABAAEAAQAEAAQAAQAEAAIAAwADAAIAAwADAAYABgACAAMA+v//////AwAJAAYA' +
'CAAFAAMABAAAAAEA/P/+/wAAAAABAAEA9//7//X/9//9//v//v/8//3//P8AAP//' +
'AAD+//7//P8AAAAABQAEAAUABwAAAAUA//8AAP//AAD9//7//////wQABQADAAIA' +
'/P/7/wAAAgAFAAUAAAD//wEAAAAEAAQA///+//3/+v8AAP//AQADAP///v/6//j/' +
'/P/6/wMAAQD+//z/9f/0//r/+f/8/wAA9//8//z/+/8BAAAA+v/8//v/+v8EAAQA' +
'BgAFAAEAAgAGAAgADAALAAQABwABAAYACgAKAAwACgAAAAAA+P/8/wAAAAAGAAIA' +
'AAD///v//v/4//v/+f/3/wIA/f8EAAMA+//9//v/+//9//v/9//1//n/+v/+////' +
'9//3//f/+P//////+f/6//r/+/8GAAMABQAGAAMABQAEAAYA//8BAAAA/v8DAAQA' +
'AgADAAEAAgD//wIA9v/2/+b/6P/Z/9z/z//N/8P/xP/J/8r/7P/s/yoALwCSAJYA' +
'KwErAe8B8wHcAuEC7QPxAxIFFAUeBiAG2AbbBiQHJgf8Bv8GbwZyBqIFogVnBGgE' +
'ZgJnAur/6P+g/Z/9pPul+8H5wPkI+AX4kPaO9mD1XvWP9I30KvQo9DP0MPS59Lf0' +
'u/W69SX3JPf0+PT4LPsq+7L9sf1iAGMAJAMlA+AF4QV6CHgI2grZCugM6wyFDoYO' +
'oQ+hDzAQMxAeECAQbQ9uDysOLA5MDE0M2gncCfsGAAfMA9EDXwBgANP80vxT+VL5' +
'+/X89efy6vJN8E7wSe5I7tfs2ewU7BTsFuwW7Nns1uxe7lnuoPCd8HnzdvPP9sv2' +
'kvqS+qL+oP7VAtICBAcDBwULBAupDqYOyBHFEUUURRQJFgsW/Rb8FhoXGRdeFl8W' +
'vxTAFFASTxIvDy0PbgttCy0HKweRAo8CwP3C/fv4/fh49Hv0WPBf8LzsvuzA6b7p' +
'lOeW517mYeYY5hzmyebN5nnoeegM6wrrae5o7nrye/Ia9x33Jfwl/F4BWwGNBowG' +
'lguYCz8QPxBNFEwUqBenFyoaKBqzG7EbOxw3HKsbqxsMGhAagBd8F/sT9hOaD5sP' +
'sAqvCl0FWwW3/7f/CfoK+pv0nvSM743vA+sB60PnQedu5G3kk+KT4tjh1+E84j3i' +
'sOOw40bmQObh6eDpRO5H7lrzW/MG+Qj5+f76/vkE9wTWCtYKVxBYEEMVSRVqGW0Z' +
'nBybHMEexB7JH8ofnh+cHz8eQR65G7sbIhgnGKoTrBN0DnMOowimCHMCdAIa/Bv8' +
'3/Xh9RDwEPDX6tbqWeZV5sPiweJG4EXg+t713uHe4N4L4AzgcuJu4unl5uVX6lbq' +
'oO+g75T1lPX7+/b7igKFAgMJAgk2DzMP3RTcFLUZsxmYHZcdbiBvIBEiDyJjImMi' +
'bSFyIUEfRh/tG/Ebfhd+FyISJhIpDDAMqQWrBc7+0P4Q+BP4rfGs8cLrxOuN5pHm' +
'ROJF4hnfGt8r3SvdhtyF3D7dPd1F30TfgOKC4tbm0+Yi7B3sQvJD8uj46vi2/7j/' +
'iQaKBkENOw2JE4QTBxkHGZcdmB0YIRYhWCNVI0AkPyTRI9AjCyIKIv4e/R7JGsca' +
'mRWbFZIPkg/dCNgIyAHHAar6qvrO887zYe1k7ZDnkuer4qzi497n3lPcVtwb2x/b' +
'PdtC28Hcx9ym36zfvePA49fo2OjV7tbugvWF9ZD8kfzFA8ED4QrgCo4RjRGPF5AX' +
'wRzGHN8g3iDBI78jVCVUJXkleCU0JDMklCGRIbIdrh28GLwY3BLZEkUMQAwmBScF' +
'uv29/XD2b/aW75XvV+lY6evj6uOG34XfU9xV3HHactr32fbZ+9r62lndWt314Png' +
'0eXQ5anrp+sy8jPySflI+aUApgDxB/MHAQ8AD5UVlhVTG1Yb/R/+H3gjeyOqJa0l' +
'bCZuJrslviWuI7EjQiBCIJYblRv0FfYVeg9+D1AIUwjZAN0AcPlw+UfyRPKW65Xr' +
'ouWg5abgo+DW3NXcXNpd2k3ZTNmt2arZe9t7263erd4g4x7jo+ig6AXvAe8R9g/2' +
'hP2B/RMFDQVnDGYMNxM5E1gZWhmUHpQeqyKqInEldSXRJtUmxybIJkUlSCVUIlYi' +
'Jx4pHtkY3BiNEpASmwueCz4EQASo/Kv8LvUx9R/uHu7F58TnVOJW4vLd9d3Y2tra' +
'Jdkh2ePY4Ngd2h/av9y/3K3greDK5dDl6uvt69Py0PIy+jD6uwG5AT0JOQl0EG8Q' +
'AxcAF7IcsRxZIVkhwSS/JMEmwCZSJ1InbyZtJhwkGSRuIGwghBuCG5AVjRXRDtAO' +
'eQd7B9X/1/9B+EP4A/EF8VLqUuph5GHkbt9w373bvttv2XDZkNiR2CfZKNkz2zfb' +
'pN6q3lfjWuMX6Rnppu+o79H20PZr/mb+IAYeBpQNlQ1zFHIUgRqCGqEfox+aI5wj' +
'NyY4Jm0nbSctJysnbyVqJUIiQSLQHdQdTxhOGN8R3hG9Cr4KOgM5A5X7lfsW9BX0' +
'BO0B7abmqOZO4U3hG90b3SraLdqq2KrYqdiq2BzaIdrs3O/cDuEN4WHmYuao7Kvs' +
'svOz8yb7J/uyArUCQApACn0RfREBGAUYox2lHSYiKSJYJVolJicnJ4YniCdwJnAm' +
'5SPlI/gf/B/SGtcauRS8FOoN7A2NBpAG5P7n/kL3Q/f77/rvWOla6YnjiePH3sbe' +
'RttJ2yLZJNl72HjYT9lP2Y7bi9sx3yjfB+QD5Nfp1+mJ8Ifw6ffi947/iP8dBx0H' +
'ag5pDjsVNxVBGz8bQiBCIA4kDyR9JoMmfCeDJwUnBicYJRslwiHKISodLh2AF4QX' +
'7BDyELUJuQkuAjECi/qL+hPzEvMf7Cbs8+X65b/gweCv3LTc8dn12Z7YoNjF2MbY' +
'ZNpl2mzdbt3O4dDhTudP56ftqO259Lj0P/w+/N4D3gNSC1ALVBJPEqkYohglHiIe' +
'hCKFIo0liiUsJyknWidXJwcmBCZGI0QjOh82HwMaAxraE98T9gz3DIsFjAXn/er9' +
'UfZT9hzvH++a6J3o9+L64mDeY94Q2xLbI9kl2Z7YotiZ2Z7ZFNwY3Nzf4N/R5NTk' +
'z+rO6ojxhfHX+NT4hwCEAB0IGghLD0oP7hXxFcYbyRuaIJkgPSQ8JH0mfiZKJ0sn' +
'pSaoJokkiyQOIQ4hYhxjHKMWpRYDEAUQyAjICDEBMAGb+Zn5T/JN8nbrd+tY5Vnl' +
'QuBB4G3cbdzt2e3ZzdjO2CnZKNn82vnaM94y3qvirOIq6Czole6V7rH1sfUp/Sj9' +
'xATEBDAMNAwlEygTZRlmGaMepx68Ir8ikiWRJfom+SbxJvEmbCVvJYIihyJcHmIe' +
'CRkOGcYSxxLcC94LeAR8BOD84vxk9Wf1Wu5c7groCuiR4pPiLd4s3hPbFNtR2VbZ' +
'BdkF2T3aO9rb3NzcyODF4Nfl0eXQ68/rm/Kb8vD57vl6AXcB/gj4CB8QGBCXFpgW' +
'SBxLHO8g7iBQJFEkVSZTJu4m6iYWJhYmziPQIywgLiBdG2AbkxWXFfwOAA+3B7cH' +
'GgAZAJr4nfhl8Wjxt+q66t/k5OQI4AzgZNxm3BTaGNos2S3ZxNnB2cPbw9sJ3wff' +
'j+OK4yvpLemn76nvx/bF9jn+Of6nBacF5QzhDLwTtxPJGcMZ0h7PHsIiwSJoJWIl' +
'oiabJmgmZybCJMEkwSG8IXodeB0UGBUYxhHHEc8K0ApxA24D5vvn+5L0k/S67bbt' +
'gOeB5y7iNeIC3gXeHtsh26LZpNmQ2Y/Z8Nrt2qzdq92h4aXhxebF5t/s2uyx87Hz' +
'AvsE+3QCcgLHCcUJvhDCEBoXHRenHKMcFiERIT0kPiQTJhMmdSZ1JmMlYyXtIuwi' +
'LR8rH0kaRxpcFFwUrw2vDY4GjQYl/yP/vfe796fwpPAh6h3qeOR35Nnf3N9r3Gzc' +
'VNpT2qHZodll2mPaj9yP3P/fAOCr5KvkXupe6s/wzvDb99r3PP8+/5sGmwa5DbgN' +
'VxRZFDUaNhoYHxgf0CLPIjYlNyU3JjYmziXLJfkj+SPIIMkgZBxkHOgW6RaUEJMQ' +
'tgm1CXcCegIT+xf73PPe8xftGe0U5xLnAeL+4QfeCN5U21Tb/tn/2SLaJdq127bb' +
'kN6P3qnipuLe59znAe4D7t/03/Qj/CH8eAN8A6EKpgplEWcRkBePF+Mc4xwjISUh' +
'HiQeJLgltyXvJe0luyS4JB8iHiI7HjwePRk8GUgTRROTDI8McwVxBSP+Iv7c9tn2' +
'8u/y76jpq+kt5DDkvt/B34rcjNyl2qnaIdom2g7bENtW3Vnd3uDl4JrlouVc62Dr' +
'3PHf8eX46/g7AEEAggeIB3YOeg7rFO0UmhqeGkIfQR/BIrsi8STxJMUlwCUrJSEl' +
'JyMfI+Yf3h90G2ob6xXjFZUPjw+hCJkIWgFTARz6GfoR8w7zeex07J7mnOa44bbh' +
'+N343XzbgNtn2mnatdq52lvcY9xk323fpOOt4+Xo8OgP7xvv4fXo9QP9Cf1CBEkE' +
'YwtpCw8SERIGGAgYKB0sHTQhNCH0I/IjWSVWJWElWiUGJP8jPCEyITAdIh0mGBwY' +
'LBIkEnsLcwtoBGAENv0r/SH2GfZU71DvHukb6dnj2OOm36bfptyn3PXa+9qj2qra' +
't9u92yTeLd7k4e/hwubO5oDsi+z78gnz9PkB+i8BNwFlCG4INg9BD3UVexXxGvMa' +
'ZR9oH68isCKvJKwkSiVFJX8kdiRZIkoi4h7VHj8aMxq0FKgUbg5iDo0HggdeAFUA' +
'Kfkk+TXyMfLK68XrI+Yf5oDhf+EH3greyNvK29fa2tpO21jbMt1A3WDgbeC15L/k' +
'CeoU6iHwLfDk9u/2EP4d/jsFRwUtDDYMsBK1EnoYexhdHV0dKSEpIbojuCPyJO8k' +
'xyTAJD4jNCNeIFMgTxxCHDgXKhc0ESgRjAqBCowDhANi/Fz8VvVQ9bTusO666Lno' +
'ouOh45jfmN/H3MvcTdtV2yfbM9tn3HLcCN8S39Xi4OK258Lng+2T7fTzBfTh+u/6' +
'CgIYAhsJJQnWD9kP7xX1FS0bMxtwH24fiyKHIlkkVCTNJMEk3CPNI5AhgSEBHvEd' +
'Txk9Ga4TmxNTDT8NbwZcBlL/QP9P+EH4k/GK8VjrT+vl5dzla+Fq4RTeG94G3BDc' +
'UNte2/rbCNz+3QreTeFd4bvlzuUg6zLrUvFi8f/3EPj4/gr/FgYlBvYMAg1IE1MT' +
'3xjkGI0dix0nISIhgyN8I4wkgyQwJCIkbyJeIm8fYB9NGzobKBYPFiIQCxBzCV4J' +
'eQJjAnX7ZPuU9Ib0H+4Q7lXoTeht42zjm9+c3//cBN2u27jbvdvI2y7dOt3h3/Tf' +
'w+PZ473o0eiS7qbuEvUm9QH8FPwGAxgD6wn4CXkQghBjFmoWdxt4G4gfhB9pImYi' +
'AiT6I0IkMSQjIxQjsiCjIAkd8xxOGDgYrBKYElgMQQyFBXAFdP5j/nz3bffo8Nzw' +
'5urd6qbloeVc4V3hOt463l3cXNzX297brNy63NPe4t4y4kTiqOa+5hvsMexh8nXy' +
'Ifk1+Q8AIQD/Bg8Hsw3CDdwT5hNAGUgZtB27HRQhFSE6IzYjCiQFJIEjeiOsIaAh' +
'mR6IHlcaRRoWFQMVGg8ID4UIdgiVAYUBoPqS+tzz0fOM7X/t8efm5zvjNeOj357f' +
'Qt1C3SXcKdxg3GXc7N333cHg0ODE5NTkxenZ6azvwe8+9lL2E/0o/fsDDATJCtUK' +
'IBEtEc0W2hatG7cbhx+MHzQiNSKbI5sjqCOjI2EiViLNH8MfDBz+G00XOhepEZcR' +
'SAs2C4AEawSa/Yj9yva59k3wPfBt6lzqXOVO5UHhO+FX3lPet9y13GDcZtxc3Wrd' +
'q9+33yrjOOO258vnLe1C7WHzdPMO+iL68QAGAccH2wdBDlUONxRGFHwZhxnHHdEd' +
'7yD2IOAi4iKEI38j1CLJItEgxyCcHZIdThk+GfsT5xPoDdUNZwdRB6EAhwDK+bL5' +
'KfMV8wft9eyi55PnJuMb47vftt+L3YfdpNyh3AvdDd3D3sjeveHE4dPl4eXf6vLq' +
'wPDQ8DX3Q/f1/Qn+zQTkBHILhwuYEbARIBc1F9sb6BuIH5MfASIIIjEjMSMSIw8j' +
'qiGjIfoe8B4UGwgbLhYdFoMQbBA4Ch4KgQNnA7D8mfwO9vf10e+57yLqDuow5SDl' +
'ReE34Y7eh94Z3Rbd8tzv3BbeGN6C4IzgHuQs5Lvoy+g97k7ub/SC9AL7GvvCAeAB' +
'egiWCOEO9w60FMoUwRnWGdsd6R3VIOAgjSKZIgEjBiMvIiwiEiAKILIcphw7GCgY' +
'6xLTEu0M1QxpBk8Gpv+H//H40viF8m3yluyA7FrnRucM4/7i19/L39Pdyt0Y3RXd' +
'rd2u3YTfi9+R4qDivebO5uHr8uvF8dvxIfg8+MH+2/50BZAF/AsXDBMSLBJ1F44X' +
'9RsKHG0ffB+1IcIhuyLBIncidCLmIN8gGB4NHi0aGhpLFTQVoQ+ED1EJMQmXAnQC' +
'1vuz+071MfUk7wrvl+l+6ebk0eQ/4Szhw96y3n/dc9193Xvdyt7O3lXhW+H95Ajl' +
'o+m46SnvQe9V9W714/sC/JwCvAI9CVwJfg+fDysVShUNGika7R0IHq8gxiA7Ikoi' +
'gSKJIn0hgSE2HzUfwxu7Gz8XMBfdEcsR4AvFC20FTAW7/pz+Hvj+99jxtfEa7Pjr' +
'EOfv5u/i1OLq39PfGt4E3ozdfd1G3j3eQuA+4HDjduO058Dn4ezw7Lvy0/II+Sj5' +
'mf+8/0IGaAa5DOQMphLPEtIX+BciHEkcah+LH38hliFQImEi3SHpISAgJiAtHSod' +
'LBkhGUEUMRSUDnwOVgg1CL4BnQEY+/f6p/R+9J3ucO5E6Rzpz+Sq5FPhL+H83tne' +
'4t3G3Q3e+d2B33XfK+In4u3l8eWz6r3qQ/BV8Fj2c/bR/PT8cgObA+YJEwr7DysQ' +
'gBWuFTMaXhrrHRUehSCqIOIh/SH5IRAiyyDdIGkecB7lGuMaWhZNFgAR6BARC/QK' +
'rASHBPz90P1m9zf3PvEJ8Z/raOvB5ozm3+Kr4gzg399s3kneEN7x3eze1t4M4QHh' +
'W+RY5KXorejN7eHtrfPH8/75H/p+AKoABAc1B0oNfQ0FEzsTEBhGGD0ccxxJH38f' +
'KyFZIdoh/yFAIV0hZx92H18cZRxCGEMYQhMzE4cNbA1IBygHzQCjAEr6Ffr587/z' +
'Ie7l7fzovuir5G7kXeEm4TzfCd9S3iTeqt6F3kTgJOAB4/Li0ubU5p3rpOst8T7x' +
'TPdu98D96v1GBHcEngrXCokQyRDYFRwWWxqcGuMdIh5JIIYgciGmIWMhjCEYIDkg' +
'ix2jHeQZ7BlQFUoV9Q/lDwcK6gmnA38DD/3e/KT2bPan8GfwQOv56p/mW+bs4qni' +
'RuAC4NLeld6d3mnept983+nhzeFL5Tzlq+mo6ebu7+7G9N70Dvs5+30BsQHWBw8I' +
'5g0qDngTwhNWGKAYSByUHCUfbB/aIBshVCGOIYcgtyCIHqwebhuDG0QXTBc2EjIS' +
'fgxqDE0GKgbm/7j/i/lS+WvzJPO67W/tt+hr6JXkReR64SvhiN8838/ejN5T3x3f' +
'EuHk4PDj0uPS58nno+yl7CvyOvIv+E/4kf6+/gkFRgVHC5ALFhFiETcWiBZ7Gs8a' +
'yh0dHgIgTSACIUUhwCD8IEofeR+vHM0cARkQGWsUaBQHD/QO+wjdCKYCeQJM/A78' +
'C/bB9Sjw2e/i6ozqYOYJ5tvih+Jx4CDgMd/n3jDf8N5k4DDgvuKX4jjmIear6qbq' +
'6O/278T14vX1+yX8SQKHApQI3QiHDtoO4xM8FIMY3hg/HJwc9B5NH38gziDPIBUh' +
'6B8fIMod8B2NGqMaXBZgFlURShGXC30LZQU1BQn/zf7G+ID4zvJ48krt7+x16Bjo' +
'i+Qp5KDhReHX34XfT98B3/fft9/P4Z/h1eS25Nboy+iq7bPtKvNG8yP5Tflr/6b/' +
'xwUSBugLOwyGEeMRdBbXFpEa9Bq2HRsevR8cIJIg4yAxIHcgnx7UHt8bAxwWGCgY' +
'dRNyExEO+Q0fCPcH6AGuAZ/7VPt89Sn1ve9f75jqLupJ5uLl9eKR4rTgUOCb30Tf' +
'tt9s3wrhyOCJ41zjGucG55zrnOvW8Orwkva69rH86fz7AkIDKAl+Cf8OXw9BFKkU' +
'thglGUUcsBzLHi4fJCCAIEkgmCAzH3Ef9xwiHbUZzRltFXMVURA/EK0KhwqhBGsE' +
'Y/4Z/j745PdQ8u3x1uxu7Cjovedx5ATkveFU4SXgxN/A32rfkeBM4I7iWuKc5X7l' +
'pumd6Y7ulu4b9Dr0GvpR+lYAngCGBuAGbwzTDOIRTRK0FikXtBoqG6wdHB6CH+wf' +
'JyCIIJcf5x/kHRweDhs2GzIXRxd7EnESCg3qDCEH8AYFAbgA3Pp8+tr0cfRC78zu' +
'U+rU6THms+X+4oTi5+B04Pnfkt9B4Onfw+F94VzkKuT159vneOx57Lfx1PGE97r3' +
'pv3v/doDNATnCVMKlQ8QEKgUKxXuGHIZShzLHJ0eGR/IHzwgwh8jIJIe3R4+HHcc' +
'0hj0GHkUfRRoD1QPvwmTCbADawOJ/TD9g/cV98nxTPGL7ATsAuhz52vk3ePi4Vrh' +
'd+D13zngyt8v4dbgTeMG43jmS+aZ6ozqjO+d7xf1RPX9+kP7DAFlARsHigf5DIAN' +
'XxLwEg4XoRfVGm0bjx0jHjEfuR+zHy8gBx9tHy0ddx04GmkaSRZeFowRgRErDAYM' +
'SwYMBjAA1f8g+q/5QPS+88zuO+4I6nHpF+Z95RTjfOIn4ZzgaeDs39fgaOBv4hXi' +
'JuXq5Nfouuhf7V/tovLC8nP4sviO/uP+pAQTBYYKDAsKEJkQ6BSFFQMZphk4HNcc' +
'Wx71HmIf7R86H60f2x05HmcbrhvvFxoYihOVE24OVg7CCIsIwgJtArr8SvzS9k72' +
'MfGe8Cjsh+vk5znne+TR4x3ifOHc4ETgwOA54ODhceEY5MTjTecU54LrbOt48Inw' +
'7/Ue9sz7GPzVAUMC0QdWCIINGA6lEk8THRfPF8EacBtYHQYe0h52HykfvB9VHtIe' +
'ZxzHHGAZpRlaFYEVoRCgEE0LJgt0BS4Fcv8K/3/5/fi68ybzau7A7c/pF+kS5lfl' +
'SeOQ4orh2eDy4E7gheH24DvjyOIE5rHlwemR6VfuSu6c87XzVvmU+U//rv9QBdMF' +
'GAu2C2wQGBEoFeYVHhnnGRwc4hwOHs4e4h6TH44eKh8fHaEdlBr3GgkXRxelErsS' +
'hA11DewHtgcNArEBEPyV+z32pPXG8BPw3usd68Tn+OaT5MPjYuKY4U3hj+Bg4bjg' +
'muIP4uzkf+RH6Pnnhuxe7HzxfvH79iX3xfwX/agCIAN9CBEJBg61DgYTyhNCFxQY' +
'ohp7GxId5R1lHiwfkB5JH6AdPR6OGwoccBjHGGUUkxSZD54PRQoiCoYEPASR/h3+' +
'tvge+CbzdfIN7kbtoOnL6AvmMOVx45bi4+ET4XDhsOAp4oHhAeR64+Pmgua76oPq' +
'V+9G74v0qPQ2+oP6FwCIAOgFewaACzYMvBCDEVkVMRYnGQwaARzfHMIdmB5uHjcf' +
'/x2uHmUc8xy7GSYaHRZgFqYRuBGIDHEM/wbABjwBzABe+8j6pfX19Fnwj++e68Hq' +
'pee85p7kt+Od4sPhteHo4PLhPOFN47jis+VD5RDpyehQ7TXtRfJa8r73AviK/fT9' +
'ZQP4AyMJ2QmNDlcPWxM8FHcXZBi5GqIb8BzSHRMe5x4dHtkeCh2lHdcaTBuqF/YX' +
'qhPJE90OzA55CTsJwgNXA979Sv0W+GL3qPLa8bTt0Oxu6YDoAuYR5Y/jo+Is4lHh' +
'5OEi4briFuKj5CbknudL547rZOs08DzwZfWe9fT6W/u/AFABjQZCBwsM3wwUEQAS' +
'iBWAFiwZJhrfG9Mcgx1lHgQe0B5qHRoeuRtBHAUZYBldFYoV2hDVELcLgAswBssF' +
'dADm/7r6Bfov9Vf0/u8O71/rY+qS54/mtOS349ni7OEX4jzhb+Ky4eLjUuNq5gXm' +
'2umg6R7uFu4e80rzifjn+DL+v/78A7cEoQl/CuoO2w+kE6MUlBegGKUarxu6HLsd' +
'vB2lHqodbx51HBodLxqnGvUWNxfOEuAS8A3LDaQISwgUA48CW/2l/KP3xvY88kbx' +
'bO1f7E/pOugO5vrkwuO14n7iguFS4njhSuOY4l/l1+Rq6BPoSuws7PXwDfEv9n/2' +
'ufs+/GoBHgIQB/AHegx4DXARgRLEFeEWRBlkGsQb2xw9HUIeox2MHuYcqh0bG64b' +
'RRilGIQUrBQOEPwP9wqxCnAF8gTB/w//Ffo6+Zf0mPOI73LuI+sA6ojnXebO5Kvj' +
'FuMI4nLifuHr4h/igOTk4xvnsOad6mnq6u7y7uXzKPRR+c358P6f/5YEdQUUChkL' +
'PA9ZENQTBRWpF+EYnhrLG44cqh1nHWgeLR0GHtsbhxyEGfkZPRZ0Fg4SCxI2DfUM' +
'7wd1B1QCpwGd/L77DPcD9tLxrPAd7ejrJOnq5wrm1OTg47viwuK44b/i2uHT4yHj' +
'/eWA5R/p2egR7QrtuvH08er2X/dj/BD9BQLmAqIHrQjzDB0OxBECE/AVMhdHGYQa' +
'qBvZHP4cEx4+HS0ebxwtHYwaEBuhF+4X4BPvE2gPMw9LCtcJwAQTBBD/Mf58+XL4' +
'LPT88kHvAO7z6qrpdOcq5t/kpuNL4yviyuLQ4WPjnOIL5XjkuOde51HrOuuv79nv' +
'rvQV9RP6uvqo/4IAQQVIBqoK3AurD/QQGBRoFcQXGhmNGtUbVxyBHREdGx6yHJAd' +
'PxviG8kYMBltFZQVTREvEX8MIQwuB5QGpwHPABH8B/uO9mT1Z/Ee8Nbse+sD6arn' +
'E+bA5BLk0+Ic4wLiRONT4nTkuuOs5jHm3Omi6eDt6e2L8tjyrvc++C79+/3YAtsD' +
'WAiHCX8NyA4hEoETDRZ7Fy4ZkRpoG7ccmhzLHbYcuR2/G40cwhlSGs8WGBf7Ev8S' +
'bw4uDl4J2Qj7AzYDav5s/eb4uPe082Ly8u6O7cvqXOl65wzmE+W746zjb+JY40Hi' +
'FOQ049rlNuWX6DboNuwd7JrwyPCH9f311fqM+1sATwHZBQEHHAtpDPcPYhE5FLQV' +
'vhczGVwaxRv4G0kdjRyzHRAcBR2AGjsb8BdmGH0UrRRUEDoQkgsuC1YGrQXaAPH/' +
'Xvs++g72xPQR8aTvpewi6wLpfuc75sTkZOQC453jXOLn49biPuVr5I/nAefD6nvq' +
'y+7P7nnzyvOX+C75/f3X/ngDkQTPCBoKzg0+D08S0hMkFq8XHRmmGiUbmRwnHHgd' +
'FRw5HQAb6RvmGIsZ1BUzFgESFBKIDUsNgwj8BygDXAKt/aD8UfgP90jz2/Gq7iDt' +
'r+oa6Y3n+uVZ5dXjH+S74vDjuOLQ5M7jtebz5YfpEeko7QPtgvGq8Xb26PbA+338' +
'IAEhAnYGsgeXC/4MSRDREWEU/BW2F1EZHRqtG4obAB3yGz8dTRtkHKgZfBoPF5kX' +
'kRPRE1cPRg+HCiYKWAWqBAAAC/+d+m75afUK9KnwJu9+7ObqBulk52rm0OTH5Ebj' +
'KOTM4pXkbuME5h/lZejG56nrV+u777vvcfTB9Ir5KPrO/rf/IgRJBVoJtAoyDrcP' +
'gRIgFCEWyBfuGI8a0RpbHKwbER15G60cSRo/Gx0YzhgHFWwVJxE4EaMMYQymBxIH' +
'VwJ5AfX82PvB92z23PJd8W7u0+yi6vroo+cB5pXlBuSE5BLjfOQ444HleeSA577m' +
'a+r36STuAO588qnyVffV94n8Vf3WAeYCEgdfCB8Mlw2rEEYShhQ2FqkXVhnqGYob' +
'Lxu0HHgbzRy3GtEb8RjIGT4WxhayEuoSeA5bDrkJSwmjBOYDXf9S/gr6wfjw9Hjz' +
'TvCy7knsmOoB6Unnkubi5BflgeOY5DDjIeXx47nmyOU26ZLogeww7JzwoPBR9a31' +
'WvoH+5T/iwDdBBkG+QltC7AOTBDZEpEUSxYQGOIYoxqTGjkcSRvFHPEaOxyYGaAa' +
'URcMGCoUkRQ5EEcQtQtrC8kGKQaOAZ8AQvwO+yj3ufVj8sbwGO5a7HPqp+im597l' +
'yOUS5N/kTeP75J/jGOb65CroVecl66bq6O7C7lDzhPMw+L34UP0x/owCuAO9BygJ' +
'nAw6DvMQtxKwFIcWrxeHGcgZkRvoGpIcCRt+HCYaWhtFGDAZfxUYFvARLRK2DZQN' +
'9gh4CNYDBQOO/m/9Xvn29230yvLs7yDuDuwu6u7oBeep5s3kVeWb4/nkbOOk5VTk' +
'TedH5t/pLOlN7ffsZfFt8QP2avYM+9H7PgBXAWkFzAZmCgYM+Q7IEAIT7hRbFlIY' +
'1xjEGmAaMhzxGpccfhrnGwkZKhqxFn4XfhPrE4APjA/xCqAKBwZUBeoA2/+++2P6' +
'r/YS9QHyMPDc7efrXOpT6LDnrOXz5QfkLuVp42fl4OOi5mPly+jg58rrQOuU72rv' +
'/vM49NT4dfn4/fX+KAN8BDAIzQnzDMkOOBE2E9MU5RauF8AZpBmkG6MafBylGkUc' +
'pxn+GrIXthjUFH4VNhF7EfwM1gw7CKwHKgM6Agb+wPz2+GX3I/RU8sLvxO366+Tp' +
'7OjT5sPmuOSQ5ajjUeWe4xjmqeTh58Pmg+rB6e3tku0R8iDyuvYx97j7lfzkABwC' +
'BAaKB+sKswxnD2ERRxNfFXEWkhjIGN4aMRonHKUaahwVGpobihi+GSAW9BbYEkgT' +
'1w7fDlgK+Ql1Ba4EUQAn/yv7r/kv9m70jPGZ74btdes56hnosOeX5RLmFORr5Zvj' +
'vOUt5BLn0eVZ6XDobuzr60LwJvCv9Pv0hfk4+pD+pf+mAxMFqghbCmANRw+QEZ8T' +
'FBUzF8QX4hmWGZ0beBpSHFca9Rs4GYoaIhcbGDAUyxSIELkQNwwADG8H0AZtAmcB' +
'WP39+1T4svaU87jxTO9I7aPriem/6KDmv+a15K7lzeOX5e3jhOYi5WboWOcg63Dq' +
'pO5b7tTy9fJ59wT4aPxX/YABxgKSBiEIXgsuDbkPtRGFE5kVlhazGM0Y3BoWGgQc' +
'ZxodHLoZJhsRGC0ZhhVIFjUSjhIjDhEOiQkQCasE0AOT/17+cvru+Jz11/Mt8Tjv' +
'Qe0y6wvq9uem553lKeY95KXl6uMg5qvkludx5vXpKekj7brs+fD08F71wvVC+gv7' +
'Y/+GAHoE7gVcCRAL4Q3FD+cR7BNIFVkX3hfrGZAZgBtKGgYcBhqGG8gY/hmgFngX' +
'pRMbFOoP+w+RCzsLzgYVBtcBwADO/Gb7zfck9hXzOPHq7uzsZ+tZ6aTomubG5tTk' +
'2OUR5OPlWuTq5q3l2ej056jrJutL7yrvg/PI8yT4zvga/SP+MgKPAysHygjdC7IN' +
'JBAgEs4T2BXAFsYY3BjNGv8ZxhspGrQbWxmdGpcXhBj5FIkVkBG+EXoNQA3pCEgI' +
'AQQFA/r+r/38+Wv4LfVi88rw1e7z7Ovqz+nK55DnneU65m7k2OVG5HXmJ+X+5wLn' +
'cOrT6bXteu2c8cfxDPaa9uH6zPvn/ygB8wR9BtkJmwtdDkgQRhJJFH8VhRfyF+gZ' +
'gBlPGxsasRu4GQ0bYBhmGSEWyRYGE0wTNg8VD9oKVwoeBj4FKQHx/x38nvo594H1' +
'qvLE8JTumOwu6zDpkOie5s/m/+QD5mXkKebO5EnnPeZZ6aboMuzk69Hv5O8h9JX0' +
'4Pi0+dD9+P7NAj8EuQdpCV4MOQ6HEHkSEBQHFt0WxhjSGJwa2BlyG+UZPxv5GAUa' +
'HRfOF2IUthTkENoQzgxkDEAIdwdSAzECQf7V/Ez5pfeb9M7yVvB07qPst+qn6cfn' +
'hOfE5Uvmu+QN5rzkx+bB5Wrouefw6pzqQ+5M7j7yp/LC9of3mvux/I8A7gGFBSAH' +
'WgoeDMcOoBCYEncUtxWLFwoYwxl6GQUb9xlCG3kZehoCGLMYpBX6FX4SdhKnDkMO' +
'PQqACXUFZwR7ACz/fPv1+ab28fQh8lPwJu5U7OPqHelk6LvmvuZC5Q/mzuRX5l3l' +
'kufn5rvpZem37LrsZfDC8K70YvVn+Wn6Yv6l/24D6QRNCPEJ3AyVDvoQuxJ4FC8W' +
'KRfFGPgYahreGRgbzRnEGsEYahnNFiAX/BP4E2YQDBBBDJMLpwetBq8CdAGd/S38' +
'tPgd9xL0Z/LT7ybuMeyL6lrpyuda5/PlP+YQ5SHmM+X75lbmt+hm6FrrXuvU7ifv' +
'5fKG82j3VPhL/Hn9UwGzAkEGwgfvCoUMOA/ZEPoSkhQGFoQXOxiVGYgZshrfGcsa' +
'PhnhGaoX/hczFTgV8BGkEfsNYg2MCa8I1AS5A9j/jP7G+lb59fVt9JTxBPC07Svs' +
'gOoO6Svo3ea45pjlKOZC5ZHm8eX556HnSOo66l/toe0o8bbxgvVR9jj6Qvso/2MA' +
'JwSHBfsIcwp4DfkOdhHvEswUMRZeF6IYCRkgGsQZoxqOGS0aYBi6GE4WXRZiEyYT' +
'sg8wD3gLtgrRBtkF3wG6AN/8lPv695b2XvPx8ULv2u3L63LqFOna5zvnLOZO5nHl' +
'VOa05VHn9uY76Sbp/usv7IXv+u+s82D0RPgw+Sn9QP4vAmYDHwdrCMULHg3wD0sR' +
'gBPNFF8WjRdqGG0ZhxlZGrAZSxriGD8ZKBdDF5kUbxRGEdgQRg2eDMQI6Qf1A+sC' +
'//7R/QX6w/hC9fjz8vCq7zztAuw56hnpAegG56/m4OVP5rjl4uaH5mnoSOjT6u/q' +
'B+5j7uzxhPJZ9if3HfsW/AoAJAH4BCsGvAn9CiUOYg8BEisTKRU+FooXgBgTGdoZ' +
'qhk7GkgZnxn0FxAYtxWWFa4SVBL9Dm4OrwruCfMFBgUNAf7/Hfz5+kz3H/bZ8qrx' +
'5O7A7YTreero6P/nMud15mjm3uWR5jzmtOeX58fp5emv7AbtQ/DN8GL0HfX7+OD5' +
'6v3s/u4CAATIB+MISgxoDVQQaBHQE8sUlhZuF3oYKBl0GfQZgRnOGY8YqBitFpAW' +
'/hOpE5EQBhB9DMcL9QcdBycDMAIy/ij9SPk5+KP0l/Nr8G7vzOzo6+npI+nc5zvn' +
't+ZE5n3mPeY15ybn4egE6Wvrv+uu7jPvlvJF8wb31vfR+7j8wgC5Aa0FqgZiClwL' +
'rw6dD2oSQhN1FSwWsxdFGBEZdxl9GbYZ9Bj9GHsXVBckFc0UBRKEETgOkw3cCRgJ' +
'HQVBBC8ASf9J+2L6kvau9THyWvFX7pjtKOuG6rnoOugn59Dmi+Zf5uLm4uYe6E7o' +
'ROqg6kftx+348JbxL/Xn9cb5kvqW/m//hgNfBGMIMQnjDJ4N2BB+ES4UuxTFFjAX' +
'exjAGEMZYBkYGQwZARjNFwsWsRVCE8gSyw81D98LMQuoB+0GVAOVAhn/W/4Y+2H6' +
'ePfS9nX06PMj8rLxafAU8DrvBe+s7pvu2O7t7snvAvB28dDxx/M99JT2IvfB+V/6' +
'Tf3x/fUAmgEyBNcE2QZ2B0MJ0gmSCwoMbw3MDaIO4g4lD0YP6Q7pDuINxQ0cDOML' +
'pglNCZcGIgYOA4wCNP+o/jD7mvoa94P2GfOK8nrv9+5x7Pzr++md6T3o+Od050fn' +
'mueJ55/orOif6sfql+3Z7WLxvPHp9VX2FPuN+7IANAGUBhwHiwwTDVUS0xK1FyMY' +
'gRzdHJAg2CCyI+IjviXUJaQmniZZJjcmyiSNJPIhoCH4HZMd9xiEGP4SgBI7DLYL' +
'7gRpBEn9z/yL9R/1++2d7c3mg+Y74Avgh9pw2tvV3tVb0nrSLtBp0G3Pvs8Z0H3Q' +
'LNKf0qPVH9Zj2uTaRuDI4CnnpefR7kLv7fZP90P/kP+vB+UH9Q8QELgXtRe5Hpge' +
'0ySXJNQpgCmYLS8tDDCSLxcxkDCvMCIw5y5bLtYrUCuWJxknRSLXIRActxsuFfAU' +
'3Q29DV0GXQbl/gH/nvfW97nwD/F26ufqCOWM5ZDgIuEd3bfdv9pd24PZH9pm2fjZ' +
'Xtrf2lbcwtwq33rfvuLx4vPmB+eR64TrcfBC8H31LPWI+hj6TP/D/qMDCQOTB+0G' +
'DAtaCuQNLw0ZEG0PsBEREZISBRLPElsSlBJDEvMRwhHpENoQlg+vDxwOWw6JDOgM' +
'+Qp2C4wJJgpMCP4IQwcDCHwGQAf7Bb4GtwVyBpwFSQarBUIG4wVfBiYGgAZVBoYG' +
'ZQZvBkcGKAbcBZIFEwWkBOgDWQNJAp0BOwB4/9f9Bf0V+zv69/ce96j02PNA8YHw' +
'1O0t7YXq/+l35xXnz+SW5KrioeIl4UvhceDA4KngIeHN4Wzi5eOj5PLmw+fb6r7r' +
'ne+N8Dj1J/Z5+178JQL5AhwJ1AkrEL8QEhd+F6cd5x22I8Yj+yjZKEwt9yyDMP8v' +
'fDLQMRczSjI+Mlcx+i8AL1QsTytJJ0Im9yD6H5oZsxhkEZwQfQjbByz/tf619W31' +
'V+xD7GPjhuMf23jbwNNL1IbNPM6pyIXJScVGxoDDk8Rfw3rE68QFxh7ILcngzNfN' +
'DtPp03zaMtvr4m/jH+xs7Nj17vXT/6//ywluCXcT5RKFHMQbryTGI8UruyqaMXow' +
'AjbVNOg4uTc5Ohc56TnbOAY4GDesNO0z9y9tLxEqvCktIxMjgxuoG00TrRPLCmIL' +
'QwIQA+j54vrm8QHzieq66w7kSuWI3sXfG9pM2+jW/tfj1NbVBtTR1GLU+9Tl1UPW' +
'Y9iA2LvbmdvO32zfbeTQ44Hprujc7trtM/QJ83D5KviI/jX9OwPoAXEHKwY0CwcK' +
'WQ5QDdMQ+A+1EhES9BOME58UdxTdFPkUthQXFTAU1BRoE0gUchKBE10RkhI+EJQR' +
'KA+RECAOiQ8vDYoOWQycDZ0Luwz1CuILXwoTC9cJSAo3CWAJXAg/CFQH8QYiBnsF' +
'sgTKA/sC2QHsAJ//ef4O/av7L/qa+Bv3WvXl8+fxiPBQ7hntxerE6Wjno+Zb5Njj' +
'w+GN4abfwN8f3obeYt0Q3ondet6n3tbfwOAi4sHjROWu50TpjOwm7jPywPN5+Ov5' +
'Uf+dAI4GpQfwDcMOThXWFWgcoRz+IuUi7CiAKPctPS3iMeAwkDROM+s1dDTdNUI0' +
'WTSoMlwxpi/qLEErFCeGJRMgrB4UGOYWPw9VDt4FQAUz/Ov7a/J98tToPunL34rg' +
'hNeX2DDQidEWyqXLc8Upx2DCMMT2wNDCScEaw0zDAMXyxnzINsyGzezS8dPE2nbb' +
'lePv4zPtLe0z9872WwGbAJMLfgprFQwUgB7iHKom2iSrLbwrXDNiMaY3tjVjOow4' +
'gTvWOQQ7mDn5ONg3djWoNIkwGTBiKlkqUCOuI4YbRhwqE0UUhgrxC+oBmAOM+XD7' +
'lvGd8zrqTuyz48XlON404NfZpduX1ijYktTV1bzTpdQJ1JLUetWd1eLXmtcf223a' +
'Id8O3rzjUOLB6A3nBu4c7FjzR/Gc+Hb2rP2E+1UCQwCPBqYEVgqnCJANLgwsECYP' +
'KRKGEZ4TZBOUFMYUDRWpFRoVHRbIFCsWMxTkFXkTYxWaErIUoRHUE7EQ4xLRD+4R' +
'7w7qEAkOyw83Da0OgAyeDb4LewziCjULBgrpCQ4JgwjEB9IGLwbbBGkEwAJnAn0A' +
'AQDn/Tf9APss+u335fa09GfzW/HL7/jtL+yj6rPofuds5Z3ke+IV4gPgC+Ac3pfe' +
'69zR3ZTc2d0j3cPeo96O4BDhL+Ni5KHmq+j16uHtHPDb8/X1ePpg/IwBLAPhCCcK' +
'QxAnEYQX/RdyHnoe2yRvJIwqtClHLwou1zI/MSc1RDMaNv4znTVcM7MzYzFVMA0u' +
'jytkKXUlgCMvHn4cARaiFB4NJAy0AywDAvrr+U7wpvDt5rjnJd5b3yjWuNc7zxjR' +
'nsm3y2vFrMfAwhTFv8EPxG3CosS6xL7GqshryiTOkc/k1O7V09xw3bbl4+Ut7+ju' +
'Fflg+CsDCQIADX0LcBabFDwfKR0GJ8gkqS1UKwczsjD3Nro0XzlMNzQ6Yjh3Ofk3' +
'LzcPNoMzzDKXLlYujyjEKKQhSyIBGhUb1RFLE3IJOQsZASIDCflC+3Lxw/Nu6sDs' +
'MuRz5vfeEeHY2rTc19di2e3VHNcu1fXVl9Xo1f3W2NZO2bnYeNx221Pg6t625PXi' +
'eOly53vuROyN8zvxjPgy9mf9HfvfAb7/2QXxA3AJ1AeMDE0LIA9KDjERzBCmErsS' +
'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' +
'oA2XDs8O+w+hD/oQMBCqEY8QGBK8EEkSvRA9Ep8QBBJqELIRKhBCEeIPuhCMDyUQ' +
'Lg+BD8UOzQ5BDgIOnw0YDdMMDgzUC9kKpAp4CTkJ6weEByUGcgUMBAUDoQFlABP/' +
'jf1d/Gb6Y/kR90L2ovMQ8y3w3e/T7MXsounZ6bTmL+ck5NnkDOL34pngsuHY3xDh' +
'0N8c4Zng6uEz4n7jq+Tm5fPnD+n+6+zszfCI8UD2wfYy/HH8ewJ0AuUIlwhUD8UO' +
'ohXVFIwbhhrtIL0fpSVXJHopGChNLOIqBy6iLIsuPC3YLass8Sv2KssoDCh9JPwj' +
'LB/yHusY/RjdEToSRQrsClACNwMb+j377vFG8x7qnOvU4m3kO9zh3Y/WL9j90YvT' +
'oc4Q0JXM083qy+/MncxgzanOH88U0jXStdZ/1mXc3NsU4znieupS6VHy6/CG+un4' +
'ywIFAdAK9QiCEp8QqRnNF/kfNx5XJb4jsilRKOIsxyvVLgcufy8IL+MuyC4OLVEt' +
'FCqxKhkmDCc/IYIiphssHYcVQxcUD/cQcwhsCsoByQNI+zf9H/Xx9oHvKfGV6v/r' +
'auaK5wbj1OOM4ALh/94U30De891Z3rLdSN9L3vPgp99K477hJOZm5GLpgOfw7P3q' +
'p/C37nT0l/I8+H321ftG+jj/7v1cAmABNAWNBL4HbwfoCfIJogsKDP4MwA0SDiAP' +
'2w4sEFcP3xChD1IRyw+WEdkPqhHQD5YRtg9fEZIPDBFjD6UQLw8rEPIOnQ+gDvgO' +
'OA44DrENVw37DE8MCQwPC9IKmAlcCe4HoQcFBo4F2QMrA3ABfgDK/oT97PtK+t34' +
'4/aq9WzzdfLy70jview17FLpWell5sLm5OOU5O3h7OKL4NHh5N9n4QjgtuHw4Lbi' +
'r+KD5FjlJOfR6IDq+eyC7tHxIvNU91/4Tf0L/okD7APoCesJQxDsD2wWuhU1HC4b' +
'ciEfIPIlWCSNKb8nKCw5KqEtnivsLeorBS0UK9UqByl3J94lDCO4IZcdmBxDF58W' +
'QxD+D68I0gi2AEIBofiQ+brwBPIw6cnqJ+IF5Njb691+1rDYO9J51C/PZtFtzY7P' +
'Ac37zvjNsc9G0K/R0NPf1I3YONlY3pne8eTD5DXsmOv38+/y8fuK+vkDQALYC9kJ' +
'RhMTERoaxBcuIModTCXzIkwpEichLBYqyS0CLDsuxCxyLVcsfSvLKnIoLyhwJJok' +
'mh8zIBUaFhsNFG4Vtg1rDzgHNAnAAO8Cjvrb/L70Ffdj767xsere7MLmwuiW41Hl' +
'QeGl4szf1eA139jfb9+l32jgNOAZ4nzhZ+Rl4y7n0eVa6q/ozO3o62vxXe8g9ffy' +
'wfiT9i38EPpt/3L9cwKuACEFowN+B1EGigm6CDQLyAqDDH4MiA3pDU0OEA/hDgEQ' +
'QA+wEG8PGxGFD18Rhg9+EXkPfBFiD14ROQ8YEQQPtRDJDj4Qfg6lDxAO3w55DekN' +
'uQzFDMMLbQuMCtEJBgnuBzAHzQUdBXcDuwLhAAYADf4Z/RD77fnq9472q/Qt83jx' +
'yu9T7nrsUutm6Zfon+Yx5kPkPORo4s/iJ+H24ZzgzOHX4F7i5eGz47zjw+Va5ojo' +
'1OkQ7A7uRfDx8gv1YvhM+iD+zP8vBIcFgApyC7gQQRGqFsIWNhzcGzAhZCB2JT4k' +
'1ig/JzYrSCmILFQqrSxMKp8rJCllKeUmBSaZI5shVh83HDUa5xU9FOoOoA19B6IG' +
'wv9f/+33CPg/8Nzw3+j26Q/il+MT3AHeAddB2f3SgNUw0N7So85e0WfOGdF9zxHS' +
'19Ex1GzVedcp2tfb6N8j4XHmMOeY7dTtOvXv9Az9PfzKBH0DUwyUCnwTXhEUGqoX' +
'6R9GHcMk/iGKKL0lMyt4KK0sHir2LKcqESwbKg0qgSj4JuEl7CJTIiAeCx65GCsZ' +
'0xLGE54MCQ5PBiYIEwBEAhH6iPxt9BP3Uu8N8tjqke0J56bpBORt5ubhA+Sc4Fzi' +
'HuB14WvgSeFx4cnhI+P34mzlv+Qn6P7mQeun6Zzuouwb8tXvqPUp8yP5gPaH/N35' +
'wf8p/aoCPABBBRYDhQetBW0J+gcJCw0KWAzbC1kNYg0SDqAOiQ6TD9kOWhAMD/cQ' +
'IQ9fESkPphEgD8YRBg+6EegOjRG7DjgReg67ECcOFxC3DT8PGg0qDk0M3wxdC2wL' +
'LwqzCaIIogfMBlQFvATSAlcCDwCf/xT9rPz0+Y35w/ZL9ofz9fJT8KDvPO1k7FTq' +
'Zum+57nmiOV/5M/j0+Kw4rDhHOI84TLio+Ea483ituS45AHnb+cF6uXqsO0W7/rx' +
'8fPT9lb5F/wY/6EBFQVNBy8LAQ08EZgSDxfkF28cshwsId4gMCVPJFUo6SZ+Kpso' +
'lStGKYAr2ShJKmcn9Sf0JHokdiHrHwQdZxq3Fx4UwBFHDVIL9gV8BFH+Zv2r9lX2' +
'RO+A7z7oFOnL4TbjHdwI3lvXt9mu02nWK9Eq1OXPCNPnzxDTMNFG1MHToNZ71wXa' +
'Ptxf3v3hoeN46Inpd+/o7+X2svaN/rz9MwbKBIUNjQtAFM0RZRqRF9ofvhxbJBUh' +
'yyd4JBsq2yZDKzkoRyuRKC0q4yf+Jzkm0ySiI84gPiAEHCAcqRZvF/QQWhLuCu0M' +
'1gRYB+3+2AE8+Xn86PNZ9yHvovL56mfufee46sjksuf44nflAuL5477hG+Mo4t3i' +
'QuNH4/7kUuQ/5+fl6unu5+nsXeod8B7taPMN8Lf2HPP0+UP2Df1t+fb/g/ymAn//' +
'BgVOAgwH3ATECC4HKgo+CVELHAtLDNAM9wwuDmoNSA/NDUEQEg4IEUQOnxFtDg0S' +
'gg5HEpAOVRKTDjMShQ7eEWYOVhEpDpUQzA2gD1INeQ6oDBgNvQtyC4IKfAnyCEAH' +
'GgfMBPMEGAJjAhr/jv/7+5j82fhm+Z71BPZa8qDyNu9G7zzsD+x/6RvpIOeE5jLl' +
'X+S/48Pi2uLP4Z7ikOEN4xbiM+Rr4xTmguWc6GDoyusC7J7vWPAD9FL14vi/+hT+' +
'dAB1A2AG8AhiDGMORBKkE88XhRjmHOgcZiG2ICAlxSP0J/wlxSlFJ4cqlicuKuom' +
'pigyJQkmgyJiIuwetR12GjgYURUAEowPKgtCCQIEtgKm/AL8RPVP9Snu4u59597o' +
'ceFt4zfctN7n187aotTd14XS8NWi0RfV+9Fb1Y7TttZS1iHZKdqC3PfexOCk5NTl' +
'/Op+687xmvH++Bf4RwC2/mAHNAUyDoILmxR9EV0a7RZMH68bSSOlH0omwSJGKPkk' +
'JCk0JucocSahJ70lXiUhJDEiqyE0HmoelBmEGnUUGxb+DkoRYQk/DLIDCQcY/sYB' +
'2vi8/AX09/ee73vz1et678PoCOxm5irpxuTz5uLjZeWz43fkL+Qu5EvlheTy5m7l' +
'CenV5n3rqug37t3qGvFe7Rj0F/Ac9/vyC/r29dH88Php/9r70AG0/gAEdgHsBRAE' +
'iQdsBugIkAgYCowKEwtQDNkL0g10DBgP9wwtEHENGhHeDdkRNA5cEoAOqxLBDsgS' +
'7A6qEgUPWRIJD9ER2w78EIAO6g8HDqwOSw0jDTsMSAvlCjAJOwnWBi8HMQTLBE8B' +
'FgI7/h7/DPv6+9j3qfie9Db1afHG8Vvuau6E6znr8ehf6Mfm6uUX5ebj4ON84jzj' +
'xuFD48fh9+OR4l3lIeRx523mHep96WftQ+1E8a3xn/W19m76LfyK/+MBxwS+Bw4K' +
'nA1BD1ATOxSlGMsYcR3SHKIhQCAMJfkiiyffJBQp5SWIKfMl2igDJRYnIiM9JFQg' +
'ZSCuHK8bThg2FkkTBBCmDToJiAcpAjQBBfvV+vTzj/Q07ZLu6Ob56Dfh7uNc3J3f' +
'dNgd3JTVh9nW0+nXRNNM1+TTvtet1TTZkNig24Pc+t5Z4R/j7Obz5yHtXu298yfz' +
'm/o6+aIBgv+CCLAF9g6LC+gUChE5GgsWxB5rGmoiEB4WJeUgvCbeIlQn7yPlJhck' +
'eyVfIysj1iEFIIcfGRx6HJ8X2xjDEtAUkw1fEDcIowvWAsgGlv3rAa74Pf0u9Mz4' +
'IvCh9LTs7fDt6brtxOcC603m3OiM5VLnZ+VV5tjl5+Xh5g/mcujF5mjq8Oer7IHp' +
'K+9r68zxmu1/9AXwOvef8un5WPV+/CP45/7p+hQBmP0SAzgA4AS+Am8GGQXVB1gH' +
'Fwl2CSMKXAsOCw4N3wuTDo4M5A8tDQIRyg3vEVUOpxLODiYTOQ9qE40PbxO5Dy0T' +
'vQ+iEp0P1hFMD8MQtA5cD9ENqg2jDLALFgteCSgJvwblBuUDTgTUAHABoP1U/lX6' +
'/vr19or3n/MJ9GTwivBP7TLtfeoW6gToVOf65QrlcuQ+42/jDuIF45jhTePo4Ujk' +
'/eLs5cvkL+ha5xXrteqd7sfutPJ080b3oPgr/Bv+OwHQA2oGpAmbC2IPoRDiFF0V' +
'+hmrGXkeZB1PInogViXUImknVCSDKPUkjiipJIAnbyNvJVkhVCJdHj8ejRpfGRkW' +
'wBMJEYANbwvYBn0F6v9Z//P4NPk28kbzzuum7eDlb+in4NTjRtz239DY4dxk1qza' +
'DtVn2dnUHdnR1dnZ49eG2/zaFN4I33rh3OOS5VvpQOpq73fv4PUU9Y/87foxA8wA' +
'kwl/BpsP8AslFQgREBqlFTcepBl1IegcvyNhHxQlDSFvJeUhzyThIUkjFiHwIIsf' +
'zh1CHQsaXBrGFe4WFBELEy0M5g4sB48KHgIIBjr9iQGr+Dr9g/Qj+dfwXPWv7fnx' +
'EOv37g/pauy/53TqGOcR6fnmIehZ56jnPui056DpROho60Dpce2T6q3vO+wT8i3u' +
'jvRW8A33qvJ7+Rb1zvuQ9w7+HPo1ALT8MAJA//4DuAGiBRkEGAdXBmUIcQiMCWgK' +
'nQo5DKML7w2SDH0PZw3QECwO7hHYDtMSbA93E+sP3hNEEPsTdRDSE4EQYRNPEJcS' +
'0Q9uEQoP7A/7DR0OlwwADNYKigm+CMYGSga+A4QDfwCLACz9V/29+en5OPZh9sLy' +
'2fJu72nvUOwp7IHpMukV56vmLuWf5NXjHOML4zni4OIK4mHjoOKc5PXjg+YH5gfp' +
'2Ogw7GTs9u+Y8Dv0TPXf+GX6xv3X/+ECeAUQCB4LJg2aEP0RxRV6Focagxq8HvYd' +
'OiK9IOQkvSKfJuEjYicqJCEniiPTJQEiiCOjH0UgcRwXHHYYIhfaE5IRwQ6BC0MJ' +
'AgVyA1L+gP2x96T3P/H48TPrrey95e3n6+C74+PcOODQ2Y7dvtfB27jW1NrI1t/a' +
'7tfZ2xXarN073V7gSOHW4w3m7+d966LsafHC8Yj3EvfG/YX8AwQAAgsKWAe9D3EM' +
'7xQsEXcZYBU7HfQYJSDaGy8iAx5RI20fhyMUINci7x9NIQ8f9h56HegbNxtOGHAY' +
'PxQ2FdAPkBEtC6kNeAaYCcsBcQU+/UoB8/g//RH1c/ml8fP1uO7N8lXsCvB16qXt' +
'Kem464DoU+pi6Gbpxej06J3p9OjT6lzpW+wl6iruSes68MTsbfKE7qf0dfDw9pry' +
'PPnq9HD7TveO/b/5mf8+/IgByP5RA0MB5ASaA00G1gWwBwkICQkwCjsKKwxXC/kN' +
'bgylD24NHBFSDlUSGg9OE8cP/RNWEGcUuxCDFPMQTRTwEMATnhDFEgcQcREuD80P' +
'8w3DDVwMYwt7CsMIPwjcBaUFswLCAlr/pf/p+038ZfjM+Nz0RfV68dHxUe537l7r' +
'VOvB6JTooeY95v3kYeTc4x/jWuOG4n/jo+JL5H/jw+Uh5enniOe46pjqC+5L7t/x' +
'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' +
'NgS5/hAJVQORDccHohEADCoV3w8ZGFATWho6FuYbjBi3HEUazRxTGzQcuBvzGngb' +
'EhmNGrAWDxnpExAXwRCUFFINrRG/CXMOGAb8CnkCXwcA/7sDvPskALn4p/wK9lv5' +
'svNK9q7xe/MM8Ajx2+4B7xTuZe2u7TnspO166+LtJ+tr7jnrQO+r6z/weuxk8Z7t' +
'ufIP7yX0vvCi9Z7yPPey9Nn46fZ6+jH5JfyH+8794P1+/z4ANgGXAtcCwwRrBMcG' +
'EQbGCMUHsQpuCWwMAAvyDX0MQg/gDVIQIg8oET4QwxEsERgS3BElEkIS6hFdEmQR' +
'JhKUEJARcg+aEAYONg9PDGINRAo6CwEIugiOBdsF3gK6Ag4AZP8s/dz7NfpE+D/3' +
's/Rf9Djxn/Hu7Rbv9urX7Gbo7+pN5mvpvuRZ6NDjxueK47bn9uMy6BzlQOn75t/q' +
'hukE7azsnu9c8KTyjvQS9jD52/kZ/uL9IwMHAjgIPQYvDWIK3RFSDikW/RHyGUkV' +
'IR0hGKQfeBpZIS4cMSI3HTIikh1SITIdkR8ZHP8cTxqtGdwXpxXOFBgROxEYDDQN' +
'rwbHCBcBGQSL+1P/HfaR+vLw8/U37JjxA+iP7XLk/Oma4fnmiN+O5FDe0uL53dTh' +
'gd6O4d3fAOIH4jbj7+Qk5XboreeP7M/qFfFw7tH1ZvK6+qj2uf8i+50EqP9BCR0E' +
'fg1aCE4RVgysFAYQXhc0E2EZ1hXJGvMXfxt1GYobWRrwGpsarBk1GuIXPxmfFbcX' +
'6BKoFeYPMxOtDGMQTwlHDdoF8QloAncGIP8CAwj8oP8l+VD8hvYl+Tb0OfZH8qLz' +
'w/Bu8aXvoO/k7jDude4k7V7uh+ya7kjsEu9k7Mfv4+yz8LDtzPHK7gzzM/Bh9M7x' +
'zPWO8033e/Xh+JH3d/q2+Qb82Pup/Qn+U/85APAAVgKdAnMETwR4Bu4FVgiNBxoK' +
'LQm7C78KNw05DHwOlg2GD9gOZhDxDwcR1RBgEXsReBHbEUkR8xHXEK0RDxAHEfIO' +
'ERCcDbkO/wv1DA8KygrVB0EIXQV1Bb8CZwL+/x3/G/22+zT6QPhP98/0ePR78cvx' +
'Ve5R74DrGu0V6UDrIufV6b3l2+jo5FjorORX6CTl5+hS5gjqIuis65Tq0e2r7Xbw' +
'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' +
'ePe091z6X/pR/SD9SADm/yoDnQLfBTQFagiuB78K/gm1DP8LSA6qDYgPDA9jEBYQ' +
'0RDCEN8QFBGNEAsR3w+lEOMO6w+hDecOIQycDWkKDgyHCEgKjAZXCIgERgaIAigE' +
'jQD+AaD+z//M/Kj9GfuW+5b5q/lF+Ov3HPdK9iH21/Rb9aXzzPSy8nL0/PFF9Ibx' +
'Q/RQ8XD0XPHD9KzxPPU/8t71EPOe9hb0cPdK9V/4svZ2+VL4ovoT+t377Psz/ef9' +
'mP7s/wIA6gF6AfED+wLxBXQE0AfoBZEJVQcxC7EIpQz0CeENFAvaDg8MjA/aDPYP' +
'bA0PEMYN2Q/nDVQPww2ADk0NVg1/DNQLawsKChcKCAh1CM8FlAZpA4IE5wBDAlr+' +
'4v/O+2f9R/nd+s/2XfiB9P71cfLJ86fwyPEr7wvwCO6q7k3tq+387A/tE+3h7Jnt' +
'Lu2M7vft6e8v76fx0vC58+jyH/Zh9cz4Hvig+xD7jv4z/pABdwGUBL8EggfqB0IK' +
'6grGDLENAg8qEOwQQBJwEt8TgRP/FB8UnBVIFK0V+hMwFTcTKxT+EaYSWhChEFEO' +
'LA7wC2gLVwleCIsGFgWQA7gBiQBW/of9/PqT+sn3xvfS9DD1MPLg8u/v6PAS7kvv' +
'tOwU7tvrSe2C6+zssOsF7Vjshu167W7uDu+77/nwV/E880TzzvV79Yr43fdi+2H6' +
'RP73/BgBjP/TAxsCZQaUBLwI6QbPChMJkgz7CvYNlgz1DuYNmA/rDt8Pnw/CD/YP' +
'Tw/9D4wOtg96DRgPLAwyDq0KDg0DCasLQAcXCm4FYAiaA4oGywGZBAIAlQJQ/pEA' +
'wPyU/kz7nvz++cL65fgQ+fn3gfcw9xf2jPbb9BX21/PL9QzzpvV58qT1JfLC9RLy' +
'/vU48lj2nfLP9kLzYPce9Af4LPXH+Gz2pvne95r6d/mf+y77xfwH/Qj+/v5d/wEB' +
'vgAAAyUC8gSOA9IGAAWdCHYGSwrkB88LOgkZDXEKJw6IC/UOcgx2DyoNrA+mDZAP' +
'2Q0cD8YNXA5nDUwNsQzpC6wLQApdClsIwAg6BtgG6gO1BHsBYwL3/un/avxc/ev5' +
'0PqM90b4SvXN9TLzhfNk8YDx7O/F78PuZO747W7tne3r7K7t3Owk7kLtBe8j7k/w' +
'f+/28VHx+fON80/2Ifbh+Pz4mfsL/Gz+RP9VAYwCPATGBQIH5wimCdoLHAx+Dj8O' +
'zRAPELcShhEeFIoSBRUgE2oVShM7FfwShBQ9EkgTERGGEXoPVQ+NDcMMVgvcCdkI' +
'vQYtBnsDZgMpAJAA1/y7/Z359vqZ9lb43PPs9XTxxPN47+3x8O1v8N3sTO9I7Ivu' +
'Newy7qLsQ+6L7bnu4+6O753wvfCw8jvyD/UB9J/3A/ZP+jT4FP2I+tH/6fx4Akz/' +
'/gSsAU4H9ANXCRUGGQsSCIsM3gmjDWcLXA6tDLgOrA3ADl8OdQ7IDtsN6g74DLwO' +
'2As/DoUKhA0JCY0MdQddC9QF+gkmBG0IdwK9BtgA8wRS/xoD5P08AZb8YP9t+4r9' +
'Y/rA+3r5Cfq4+G/4GPj39pr3rfVD95b0Cfev8+j2/vLk9ojy+fZO8iX3VPJj95ny' +
'ufcg8yX44POc+M30LPn19eP5X/ew+vH4jPum+ob8g/yb/XX+x/52AAwAhQJjAY0E' +
'xgKABjYEXgiuBSAKIAe0C4AICw3NCScO+QoBD/oLjw/KDMwPXw20D68NRA+yDXsO' +
'Yw1gDcMM/QvWC1EKkwpgCPgINAYQB9sD8QRpAaQC6f4pAGP8kP3m+fD6f/dd+EH1' +
'5vVB85zzhfGP8RXwzu/67mruRe5v7fnt4uwS7tHske5B7XzvK+7N8IjvdfJa8W/0' +
'l/Oy9i32MPkX+eT7PPyz/nn/fwHCAkEEAgbvBiIJcgkPDLwLrw7ADfYQdQ/QEs4Q' +
'KBS9Ef0URBJLFV4SCxUMEj8UUhHoEiwQFRGoDtcO1Aw8DLwKUgloCCsG5AXjAkUD' +
'kf+dAEf89/0l+Wf7Ofb6+JXzvPZN8bj0bO/48gHujvEW7X/wqOzF77nsa+9G7XPv' +
'Se7Y77/vlvCO8aPxrfP88g72lfSV+Fr2N/tS+Oj9cfqSAKH8IgPY/n8FBQGcBx4D' +
'fgkiBREL/wZJDKoILw0mCsMNawv+DW4M3w0rDXINog3ADNcNzAvGDaQKcQ1XCd8M' +
'6QcSDGgGDAvbBNEJTQNuCNAB7AZkAE4FD/+fA9j94wG+/B4Ax/td/uz6o/wu+vr6' +
'lPls+RX5+fey+Kn2bPiJ9Tv4mvQh+ODzFPhX8xT4CPMu+PvyVfgn84T4ivPI+DH0' +
'JfkW9ZP5KfYP+mf3n/rV+Fb7d/o1/ET8K/0k/jT+DABh/wYCrwAIBAkC9QVqA8QH' +
'0wRwCTwG9gqcB0sM7ghmDSMKOw4qC8IOBwwCD7IM8w4PDYgOIw3NDe8MxgxiDGwL' +
'fQvOCUoK9gfNCOwFBAe2A/gEXQG6Avn+WgCZ/OT9Rvpi+wj44/ju9YL2D/RP9HPy' +
'VfIg8avwIvBg73/vd+457/ntVu/z7drvaO698FDv8vGw8IDzf/Jd9af0dvcl98P5' +
'7Pk5/Ob8xv77/1sBEQPkAxsGVgYICaUIuwu8CiEOlwwqECgOxhFdD+sSNhCNE68Q' +
'qhPGEEYTfxBfEtgP/xDVDjMPfg3+DNYLcQrrCaMHyweqBIUFngEmA4/+vQCT+1v+' +
'wPgH/CX2yPnY87n36PHj9V/wS/RG7/vyo+758XbuRPG77uTwbe/a8I7wJvEL8r7x' +
'0POd8tn1w/Mb+Cn1f/rJ9u38lfhW/376sQF+/OcDhv7fBYQAnAd2Ah4JVwRZCiAG' +
'QgvDB9wLOQkqDH0KKgyGC94LTAxPC9MMiQoZDZQJHA15CN4MQwdmDPsFswuyBMsK' +
'agOwCSACZQjlAPIGwv9eBbn+twPP/QgC/PxJAET8h/6w+9j8Mvs1+8X6oflu+i34' +
'LPre9vj5uPXM+cD0qPkB9I75fPN7+THzdfko83f5XfN/+czznPmA9M35bPUL+oj2' +
'ZPra99z6Xvlx+wr7KvzX/P38sv7r/ZEA/f57AjEAYwR7ATQG1ALqBzcEewmfBeAK' +
'AQcPDFEIAg2DCbMNjAobDmsLOA4XDA0OegySDYoMxQxKDKoLvQtPCt8KvgiuCfoG' +
'NQgLBXMG9AJxBMEAPQKG/uH/Tvx7/Sz6GPsp+Lj4SvZ39qL0avQ285vyDvIY8Tbx' +
'7u+t8DDvgPDe7q7w9e4w8YnvDvKM8Drz+PGw9Nfzc/YO9mv4h/iJ+jf7yPwK/hT/' +
'9wBoAegDuwO9BvgFZwkPCNgL8Qn7DZsLvw8FDRYRIQ76EecOYhJVD0wSaw+8ESgP' +
'uhCSDkQPpw1oDXEMOgv4Cr8IOAkQBkgHTQNDBXsAIQOp/ecA7/qs/mH4fPwX9mr6' +
'HvSB+Hnyw/Y78UD1afAB9ADwCPMA8FbybvDw8T3x2vFf8g7y0vOQ8o/1YPN692z0' +
'hfmt9a77K/fi/dv4CACk+hICgPz2A2r+owVRABgHLwJaCAcEXAnHBRIKXweACs4I' +
'rAoOCpYKEwtHCtoLwglfDA8JpAw6CKwMSgdxDEkG+gs4BUcLHARVCg0DNQkKAuwH' +
'BwF1BhsA5gRG/0YDe/6QAcT90P8m/Rf+mfxr/B380fq0+1L5U/v09/f6uvaq+rD1' +
'ZfrX9CT6NPTw+c/zwvmj85z5svOG+f/zgPmK9Iv5VfWl+VL22fl+9zL64Pis+mr6' +
'R/sX/AL82f3f/KX/6v1/AQ3/VQNCABkFlQHNBvkCXwhoBMsJ1wUICzYHCgx/CNEM' +
'pglSDaAKiQ1pC3sN7gshDSsMfgwlDJcL1AtuCisLBwksCmYH4QiUBVQHnwOIBZUB' +
'ggN7/1cBXP0W/077xvxW+Xr6e/dC+M31KfZT9Er0HPOx8ivyZvGF8X3wNfH37zfx' +
'1++P8SfwQPLf8DvzBPKD9IzzFPZm9dn3mffY+RH6Afyr/Df+XP93ABsCtwLOBOYE' +
'XQf2BrwJ4QjiC50Ktw0cDCcPUA0xEDYO0xDLDv4QBA+yEOUO9w9yDtIOqw1QDZoM' +
'dwtAC00JoQnuBs8HbQTUBdMBtwM3/4YBp/xN/zb6Hf3/9wj7D/YW+Wn0S/cQ87P1' +
'GfJe9IrxUfNY8YvyifEU8hny8PH88hryKvSR8p31UPNN91r0Jvml9RL7IPcE/cX4' +
'7/6I+tEAZvyiAlj+SARKAMAFNQIIBw8EDgjFBdMIUAdgCbQIrgnnCboJ3wqNCZUL' +
'MwkLDK8IRAwFCEEMPQf8C2AGdQt1BbcKgATLCYkDswiaAnAHswEMBtkAkQQMAAQD' +
'R/9lAZD+x//t/TL+WP2m/NH8Lfta/NP57PuX+ID7evcf+4n2x/rF9XL6MfUp+tj0' +
'6/mz9Lf5vfSS+f70evlz9Xj5H/aQ+fv2vfn89wr6JPl3+nL6CPvi+737a/2T/AD/' +
'kv2kALD+SQLi/+EDKQFsBX8C4QbfAz0IQAV3CZQGggrZB1wL+wj7C/IJXQy9CoYM' +
'RAtkDIgL/QuLC10LRQt8CrcKXwncCQgItAh9BksHxgSlBewC0AMAAdIBBf+3/wP9' +
'j/0L+2j7KflU+Wn3X/fS9ZX1b/QL9E3zyfJt8tfx2vFA8ZzxBfGt8THxE/LB8c/y' +
'sfLW8wD0KfWk9cH2kveW+Lf5l/oG/Lf8e/7z/vwAOAFzA3YD0gWgBQkIpgcOCoUJ' +
'0QswC0cNlwxjDrMNGw97DnEP8A5eDwkP5A7FDg8OLQ7ZDD0NTgv7C4EJdwp7B7UI' +
'TAXEBgcDsAS4AIUCbf5OADL8FP4b+ur7Nvjg+Yv2/fcs9VH2G/Tk9F3zvfP28uPy' +
'3fJT8hrzE/Kr8ynygPSN8pP1PPPg9i30V/hc9e/5yfaf+2b4U/0f+gP/7/usANT9' +
'QQK//7YDoQEABXADHQYfBQ0HqwbLBw4IUQg5CagILArMCOYKwAhmC4oIqgsvCK0L' +
'sgd0CxkHBQtpBmAKpwWICdoEiggFBGoHJwMkBkUCxQRoAV0DkQDoAbz/ZgDy/uz+' +
'NP6E/X79KPzR/N76Nfyy+aX7p/gd+7z3ofr39jT6WvbX+en1iPmk9Un5ivUh+aL1' +
'Dvnr9RH5YvYy+QX3dPnU99j5y/hY+uf59voj+7n7ffyb/Oj9lf1i/6X+6ADN/2wC' +
'DAHsA1gCZQWlA80G8AQbCC0GQglSBzwKWggICz4Jogv0CQEMdQogDL8KAwzJCqIL' +
'jAr5CgwKFQpNCfcISgiYBxQHCgakBVIE+ANtAi4CdwBXAH7+cv6C/Ib8jvqe+q74' +
'0Pjt9ir3XfWz9Qb0evT28o3zNPLq8rzxlfKV8ZjyyfHz8lPyo/Mw86X0YfTz9dv1' +
'gveV91H5iPlR+6r7cf3p/aD/NADOAXoC7wO1BPsF2gbiB9UIlgmdCggLJgwqDF0N' +
'AA1BDoYN0w6yDQsPhg3mDgMNZA4wDIkNEgtcDLAJ5AobCDIJWQZNB3EEOgV5Ag4D' +
'dwDVAHH+lv5//GT8tPpS+hr5b/ix97/2gPZH9Y/1EvTg9Cbzd/SM8lr0RvKD9E/y' +
'7vSn8pf1S/N79jn0kvdn9cv4yPYi+lz4jfsL+gH9y/t9/qT98f+G/1MBVwGnAhoD' +
'2wPDBOwERwbbBZ4HoAbACD0HsQm1B20KAQjrCiAILAsaCDUL8gcFC6sHnApFB/0J' +
'yAYzCTQGQAiLBSkH1gT8BRYEuARHA2EDcAL/AZMBmQC2ADb/3v/i/Qv/ofw2/m/7' +
'X/1P+o78SvnL+2j4Fvus92j6EffK+Z32QvlR9sv4K/Zt+DL2MPhr9hP4y/Ya+Ff3' +
'RvgM+JD43PgC+c/5o/ns+mv6JfxU+3H9W/zK/oL9NgDG/qwBGAAYA3kBgATmAuIF' +
'SQQnB6IFTgjuBlkJGQg6CiMJ6Qr/CWILogqjCwkLrAsrC28LCwvuCrAKNwoPCkQJ' +
'JwkSCAsIsQa3BiUFKAVsA24DlAGYAaf/qv+w/bf9vvvP+975/PkZ+Ej4efa+9g31' +
'avXa81T05/KF8z3yBvPn8dby4vH58izydfPR8j/0yfNR9Qz1q/aY9j/4XfgE+lb6' +
'8Pt6/PH9sv7///QAEAI6Aw8EcQXwBYoHrgd2CTgJKAuBCpUMhgu2DUQMhg6zDP0O' +
'zgwWD5sM0Q4dDDIOVAs8DUYK9Av9CGQKhAeWCOUFlwYrBHMEXgIyAokA5v/B/qn9' +
'Cv1/+2/7cvn7+ZT3sPjq9Zb3gfS29mbzFPab8rH1I/KG9f7xmPUu8uf1sfJq9n7z' +
'GfeS9PL35/Xy+G/3EPoj+UD79/p8/N38wP3I/v3+qAA2AH8CawFDBIwC3QWQA0QH' +
'fAR9CFMFhAkNBk8KpgbaCh0HKAtxBzcLpwcJC8EHowq3BwgKjQdBCUcHUwjlBkQH' +
'bQYbBt4F3QQyBYwDdAQ0AqYD3wDHApD/2gFJ/uAADv3g/+r74f7h+t/98/nf/CP5' +
'5fty+Pj64/cZ+nb3S/kq95j4BPcD+AL3i/ch9zj3ZvcR98v3GPdS+Ez3+fin97r5' +
'O/ii+gf5qvvz+b38BPvd/UD8Ff+d/VoAEv+jAZkA7AInAjUEtAN2BTUFogakBrUH' +
'9wesCBwJfgkQCiYK0QqjClQL6AqWC/QKlQvJCkkLYQq5Cr4J5QnfCMsIxAd7B3sG' +
'9wUDBUIEWgNwApgBigDB/5r+3v21/AH83Pou+hj5aviA98v2HfZc9fX0J/QT9DTz' +
'fPOK8jPzMvI48y3yjvN78jP0HvMi9RP0UvZU9cD33/Zh+av4I/um+gP9xvz6/gX/' +
'7gBPAdQClAOpBMoFWwbeB94HwwkuCW8LQQrQDBIL4g2aC50O1wv9DtEL/w6FC6AO' +
'8grkDR8K0wwVCXAL3QfFCYEG4wcEBdEFcgOaA9sBVAFAAAf/o/68/Bz9i/q3+4f4' +
'dPq79lj5LvVs+Obzr/fs8iP3SPLJ9v7xpfYM8rP2cPLv9ifzWPcq9Ov3cPWf+Oz2' +
'a/mU+FP6ZfpR+1H8WfxB/mb9LgB1/goChP/NA5cAdAWeAfAGkAIzCHQDPAlLBAYK' +
'DwWUCroF5ApNBvQKywbFCigHXApmB8AJjQf6CJoHDAiIB/wGVwfSBQoHmASjBlgD' +
'GwYVAnMF0wCwBJb/0wNm/uICUP3aAUz8wgBe+6X/kfp9/tz5S/1B+SD8yfgA+274' +
'7fkv+O74EPgL+A34S/cl+LH2VvhE9qb4CvYV+QX2m/k69jn6pfbv+kj3uvsm+Jv8' +
'NvmL/Xj6kP7o+6T/d/2/ACX/5QHcAAoDkwIkBFAEOwX9BUMGigc0B/cIEQgzCssI' +
'MQtdCfALxglmDPsJkwz9CXcMzgkKDGkJSgvFCEIK6wf9COEGdwejBbwFOATdA6oC' +
'4QH+ANX/Qv/F/X39wPu4+9X5A/oR+Gf4gfbv9i31p/UZ9JX0S/PC89PyOfOw8v7y' +
'2vIP81jzdPMo9C30PfUw9ZL2fPYd+Ar40/nL+a77t/uh/cf9nP/w/5MBHwJ6A0EE' +
'RQVNBugGNghZCOsJlAlfC44KjAxGC24Nuwv8DeoLLg7QCwYObguCDc4Kpwz3CXkL' +
'7AgGCrQHVghYBm8G4QRjBFYDQALIARYAQADw/bf+1Ps7/df54vsQ+Kj6e/aS+Sj1' +
'pvgk9OH3afNO9wPz6Pbv8qn2KPOb9rHzvPaD9Aj3mvV79+72Dvht+MT4E/qW+dH7' +
'e/qb/Xf7av+B/C0Bl/3dArb+cQTW/90F9QAcBwwCJQgbA/cIIASSCRUF8Qn3BRYK' +
'wAYBCm4HtwkCCEAJcwicCMQI0gfwCOcG8QjgBcoIxwSACKYDDQiAAm4HWQGiBi8A' +
'tgUR/68EC/6CAxH9NwIm/N4AVft0/576AP4B+oz8f/ki+xb5zPnM+I/4nvhs94n4' +
'dfaX+Kv1vvgU9fn4ufRP+Zj0wPm39Ez6GPXv+rf1pPua9nL8ufdV/Qv5RP6P+kT/' +
'PfxQAAn+YgHl/3QCywGDA7UDkgSNBZIFQwd6BtkIUAc/CgcIaAuaCFgMDAkADVAJ' +
'VQ1gCVkNQQkODe8IcQxjCIsLpgddCrwG6QigBToHVwRaBekCWwNfAU0ByP81/yj+' +
'Hf2E/Bj77Pox+Wf5b/f99+P1vvaX9LD1kvPc9NzyTvR38gX0ZPID9KjyUPQ28+P0' +
'CvS59Sv11/aN9jP4JvjG+ej5hPvC+179sv1O/6//SgGlAUIDigMoBVEF7AbyBoUI' +
'awjyCawJIQuvCgcMcAufDOkL5AwbDNoMCAyADLEL1wsaC+MKRwqrCUEJOQgMCJQG' +
'sQbIBDoF4wKrA+oAEgLw/n4AB/3x/jb7bf2G+QD8BPi0+rz2jvmx9Y745/S492X0' +
'EPcu9Jz2Q/RY9p30PvY39Vb2F/ab9i33Cfdr+KD30flW+FH7LPnk/CP6g/4s+x0A' +
'RPynAW79IQOf/n8Ezf+6Bf4AzQYvArIHVwNmCG4E6Qh2BTsJawZZCUYHSAkHCA0J' +
'qQilCCMJEAh1CVoHmwmEBo4JjQVTCYIE5whmA0YINwJ2B/8AfAbK/14FoP4iBIH9' +
'xQJw/E8BdPvN/5f6R/7V+cj8L/lX+6/49vlT+K/4G/iO9wn4nfYi+Nv1X/hP9b74' +
'/vQ/+ev03vkY9Zr6hfVs+y72VPwT90/9LfhX/nb5Y//i+nEAavx4AQv+eQK+/28D' +
'cQFVBBgDJAWtBNgFJAZpBnQH3gadCDoHlglzB1oKhgflCnkHLAtGBzQL7wYFC30G' +
'nQrvBfwJRwUhCX8EEgidA+UGtAKTBbwBHQSuAJsCpf8RAaD+f/+X/fT9lfx4/KL7' +
'DvvB+rv58vmI+Dr5f/eg+KD2KPjv9dT3bfWf9x71kfcH9bH3JfX593n1avgD9gP5' +
'tva++Z73ofq4+Kr79PnN/FL7DP7J/Fz/T/60AOz/GgKSAYIDOAPgBNgEMgZhBmsH' +
'zgeCCBsJcgk9CjMKLwvDCuoLGwtiDC4LnQwCC5kMmgpKDO0Jrwv8CM4KzgerCWkG' +
'TQjWBLMGGgPlBDkB9wJI//UAVf3b/mT7ufyC+aX6wPes+Cn21fbF9DD1ovPM89Hy' +
'q/JR8tTxJPJa8VTyOfHZ8nTxtfMR8uv0A/Nr9kb0KfjX9SH6q/dF/Ln5h/7y+9kA' +
'Rf4nA6YAYgULA38HWwVqCYYHFAuFCXkMSQuLDboMOw7SDYgOlQ55DvsOCw76DjoN' +
'lA4NDNMNkwq7DNYIUAvhBqMJxQS4B44CmgVHAGMDCv4oAen77f7o+cL8Gvi7+pT2' +
'3/hV9UD3Z/Tz9drz8/Sh8zv0t/PP8x70s/PV9Orz0fVx9Az3PvV6+EP2Cvp596/7' +
'1/hh/VP6Ev/j+7YAev09Agj/ngOEANQE5AHTBSMDmQZEBCwHOAWGB/cFnQeNBoEH' +
'+AY+BywHygYzBywGHAd5BeEGsgSFBuADFwYPA5sFQwIPBYIBfgTVAO8DPgBeA7r/' +
'0QJR/1ACC//SAdj+WAG4/ukAr/57AKz+EACs/qf/tf46/7/+zP7F/lf+uf7X/Zr+' +
'UP1w/sD8Mv4u/OT9l/uG/f76Gv1u+qr84/ky/GT5wfv7+F/7qPgG+3f4w/pz+Kb6' +
'oPi1+v347fqG+Un7RPrX+zv7mfxh/IP9s/2Z/iv/0/+/ACYBagKKAhsE9gPIBWIF' +
'age/Bu8I/QdGChAJZQvxCUgMlQrgDPAKJQ0ACw8NwAqcDCwKzwtICaoKFggvCZgG' +
'ZQfYBFsF5wIjA9cAyACu/lb+e/zg+1T6b/lC+B33WfYI9a/0NfNO87XxR/KV8KLx' +
'3e9g8ZHvhvG67xryXPAb82zxfvTf8jb2svQ8+N/2hPpN+fn85/uD/6H+FwJpAaEE' +
'JAQIB8cGRQk9CUELZwvgDDkNHg6wDvkOwQ9nD14QYA+BEOUOMxACDnUPuQxHDg8L' +
'uwwaCdgK6AasCIYEUgYNAtoDkP9RAR79zP7M+mD8r/gb+tD2Dvg99Ur2BfTb9DPz' +
'xfPG8gvzufK28hPzwvLL8yXz1PTf8yj26fS+9zb2g/m392n7W/lb/RX7R//f/CQB' +
'qP7nAl8AfQT1AdkFYwP0BqEEyQeoBVQIdQaXCAgHkwhfB0kIegfBB2IHCQcaByYG' +
'pAYdBQ0GAgRmBeMCsQTIAfYDvAA8A8b/igLt/usBOv5eAbL95QBW/YYAKf1CACj9' +
'EABK/ez/if3g/+n93v9b/tT/zf7P/0P/xP+x/6b/BgB7/00AQf99AO/+iQCB/m4A' +
'+f0xAGD91P+6/Fr/DPzI/lv7Jf6t+nX9CvrD/H35IPwT+ZT70fgi+7/41Pri+Lj6' +
'PfnN+tL5Fvui+pP7q/tJ/PD8Of1i/lX++f+Z/68BAQFyA3kCMwXxA+cGZQWECMoG' +
'/QkQCDwLIAk2DPYJ4QyHCjINxgouDbYKxgxPCvULjAnICnUIQgkOB2sHYwVUBYID' +
'CgN0AZgASP8P/gv9hPvT+g/5tPi+9sL2n/QJ9cbylfNO8XnyPfDD8Zvve/Fu76Hx' +
's+8t8nPwKfOm8Y30PPNH9jb1VfiB96X6Bvog/b38uv+N/1sCWgLsBBUFXAevB5wJ' +
'EAqXCx8MNQ3XDXEOKQ9ADwkQmg93EIcPbBD7DukP+Q37DpYMng3TCuYLwgjpCXkG' +
'qQcABDkFbgG0Atv+LgBc/LT9APpZ+9f3Mfn29Ur3afSv9TzzbvR38onzGvIC8yfy' +
'2fKd8hDzdPOi86L0h/Qi9rf16vcf99v5s/jl+2b6/v0m/BQA7/0bAq///wNPAagF' +
'zQIVByAEPAg6BRMJGwabCb4GzgkgB6sJRgc/CTcHlQj6BrIHkAadBgIGZgVZBRsE' +
'oATGAuYDeQEsAzoAdwIR/9QBD/5FATf9zACO/G0AFvwoANX7///J++v/6fvo/zH8' +
'9f+e/AMAIf0OALD9FwBI/hQA3/4BAGr/4P/m/6X/RwBK/4UA2P6jAEz+mwCr/XAA' +
'/vwoAEX8wv+I+z//1vqx/jL6G/6l+Yf9OPn+/PD4hfzY+Cj8/Pjy+1z56/vz+RL8' +
'wfpo/M378/wQ/a/9fP6V/g4Apf+8AdcAcgMaAiUFZAPJBqsEWAjnBb8JCgfnCv8H' +
'xgu8CFcMPQmXDH0JgQx1CQsMGwk3C3EICQp6B4MINQa7BrAEtwT5An0CFQEiABb/' +
'uv0J/VT7/voH+Qz54/ZA9/j0qvVV81j0BPJU8xfxrvKX8G7yhPCV8t/wI/Ou8Rr0' +
'6vJz9YD0IPdo9hT5mvhF+wT7ov2T/R0AMQCcAssCDQVTBWEHrgd9CcwJUwumC9kM' +
'Jw3+DUAOug7wDgoPMw/nDggPUA5zDlANeQ3tCyAMLgp1CiYIiAjnBWkGfgMnBPwA' +
'0gF4/oH/DfxG/cr5K/u39z/55vWS92r0MPZM8yb1lvJy9E3yFPRp8hH06vJh9Mnz' +
'/fT99OT1gPYL9z74ZPgq+uL5Nfx1+0r+Ef1XAKz+VQI6AC8ErAHTBfkCNwcZBFgI' +
'BgUsCb8FsAlDBuUJigbGCZwGXAmABrEIMAbEB7wFqAY1BXIFlAQeBOYDwAI4A2oB' +
'jAIgAOwB8f5dAef94QAH/X0AV/wrANP77v+B+83/afvE/4H7y//B+9z/J/zv/6n8' +
'//87/QoA1v0QAHb+AwAM/+D/kv+s/wcAXf9cAPT+jAB4/p0A5v2KAEf9WQCj/A0A' +
'/vun/2D7MP/L+q7+S/oo/uz5rP22+UH9rvny/Nr5xvwy+rr8vfrT/H/7Gv10/JH9' +
'mf02/uf+Av9TAO//0wH4AFoDEwLgBDcDWwZYBLkHawXwCGYG8Qk6B7EK3AcvC0kI' +
'XQtzCDkLWQjCCv0H8glTB9MIXwZxBzEFyQXJA+UDLALbAW0Auf+Y/o39u/xp++f6' +
'VPkm+WX3ivex9Sj2P/QG9R3zM/RW8rbz7/GP8+7xyPNT8mP0GPNa9UL0rPbC9Uv4' +
'iPcm+o35OPzG+3P+IP7GAIUAFwPkAlMFMgVyB1YHXAk+CQIL5wpeDD4MXQ0zDfEN' +
'yg0eDv8N4g3RDUENPw08DEwM1goECx8JcgklB6cH+QSxBa4CmQNUAHIB+/1O/7P7' +
'O/2O+Ur7pPeN+QH2Cfir9Mj2r/PU9RXzNfXh8ur0E/Pr9KLzOPWJ9NT1xPW29kr3' +
'zvcH+Qv55fpr+tz84vve/mH92wDe/sUCSQCFBJsBEgbRAmcH1ANwCKQEKglKBZwJ' +
'twW5Ce4Fhgn7BRAJ3AVbCJYFbQcyBVEGsgQOBSQEugOQA2IC9gIMAWACxf/YAZ3+' +
'YAGX/fkAufypAAz8bACS+0QAS/swADX7KgBP+zYAmvtOAAv8YQCR/GwAKv1vAM39' +
'ZQBy/ksAE/8ZAKT/zv8cAG7/dwD2/rMAZ/7MAMn9wwAm/Z4Ad/xYAMT79v8d+4P/' +
'ifoF/xH6hv65+Qr+g/mW/X/5P/2p+QX9BPrp/J76/fxt+zv9Z/yd/ZH9Lv7i/ur+' +
'UADJ/9IBxABYA9AB3ATmAlEG/AOrBwYF3Qj7BdcJzQaVCnEHEAvgBz0LFAgZCwcI' +
'ogq0B9kJGgfACD0GYQcfBcMFyAPxA0IC8gGVANj/zf62/f78nvs5+535ivnA9//3' +
'E/ai9qT0gvWH86/0xPIw9FryBvRS8jr0rPLL9GLzs/V69Pb26/WI+J/3U/qP+VL8' +
'rft3/ur9rgA8AO4ChwIcBbkEJAfLBv4IqQiYCkYK5AuaC9kMlQxoDTENkQ1uDVYN' +
'Rw2wDMMMqAvsC04KxAqpCFEJvwaiB6IExAVjAsoDGADDAdT9uf+i+7/9l/nn+8f3' +
'Ofo79sL4APWL9x30mPaW8/L1cfOY9avzi/VD9MT1MfU+9mf2+/bj9/L3lfkR+Wn7' +
'UfpS/aX7P/8E/SMBZv7wArr/lgT2AAcGFwI6BxkDKwjwA88IlQQkCQ8FLQlbBesI' +
'fAVnCHgFqwdQBboGBgWgBaIEagQuBCMDswPZATUDmAC4Amv/QAJY/tMBav13Aav8' +
'KgEc/OwAu/vCAJD7qACZ+5UAyvuLACH8hwCZ/H8AJP1yAL39XwBg/jwAAP8MAJX/' +
'y/8WAHD/eAAG/8MAjP7tAP397QBi/c8AwPySABz8NgB5+8P/3/o//2H6uf4E+jf+' +
'wvm7/aX5Uv22+QH99PnN/Gf6w/wN++L83vsn/eL8m/0U/kD+Yv8G/8kA7f9AAvEA' +
'uAMCAisFGQOLBioEzAcrBecIFQbLCdgGbgpoB8wKwgfjCuIHrArBByMKWgdLCa0G' +
'KwjABcUGmAQjBTwDVQO3AWYBEgBd/1b+TP2V/Ev75/pg+VD5mPfc9wr2oPa/9KT1' +
'v/Py9BbzlPTF8ov01fLd9EbzivUR9Iv2L/XZ95v2bPlN+Dv7OPo4/U38U/99/nsB' +
'tgCdA+gCqgUDBZQH9gZECbMIrAozCskLaAuODEQM8gzHDPQM7AyRDLIMzAsiDLAK' +
'PgtECQ4KkAeeCKYF+QaSAyQFYwE3Ay7/RAEJ/Vb/Avt6/SX5u/t+9yT6HfbG+BH1' +
'p/da9M/2/fNF9gX0/vVl9P71GPVM9iH22PZt95j38PiO+KL6qPlv/Nz6Rv4m/B8A' +
'df3lAb/+jQP9/w0FKQFXBjQCXgcXAx8I1AOdCGgE0gjPBLwIEAVjCCgFyQcYBfgG' +
'6gT+BaME5ARIBLED2gNyAmUDOAHxAgoAgALx/hsC/f2/ATH9bwGM/DIBGPwDAdP7' +
'3wC8+80A1vvGABz8wwCE/L8ABP21AJH9pAAr/ocAxf5YAFT/GgDX/83/SwBs/6YA' +
'9v7fAG/+9gDc/e4APP3DAJf8fAD0+x0AV/uj/8n6G/9R+pH+8/kM/rz5lf2u+TD9' +
'yvnj/Br6vfyd+r38T/vk/DL8Ov09/bn9av5f/rv/Lf8jARwAlAIeAQYELAJtBUAD' +
'vgZQBO8HTQX0CC0GvwnhBksKZweUCrgHkwrLB0MKmAekCSAHuAhnBo4HdwUoBk0E' +
'hgTsAroCZAHSAMP/2f4S/t78YPzz+r36Jfk1+YD31/cR9q/25PTI9QX0LvV68+X0' +
'RfPv9G/zUvX28w72z/QV9/f1Z/hs9/35H/nG+wT7tf0O/b//Kv/QAUkB1gNdA8IF' +
'UgWEByAHFAm5CGIKEwpgCyILBgzbC08MPgw5DE0MyAsCDPwKXgvaCXEKcQhCCcoG' +
'1QfuBDoG7wJ8BN4AqwLO/tkA1fwH//T6Q/05+af7wfc3+o729/il9fb3E/U299v0' +
'uPb29ID2ZfWN9if22/Yw92T3dvgi+Oz5DPmF+xr6M/1C++f+dvySAK/9KwLl/qMD' +
'CwDqBB0B/gUTAtkG5wJyB5cDyQcdBNkHeQSiB7EEMgfGBJEGugTDBZME0QRWBMgD' +
'BgSxAqkDlwFIA4kA5QKK/4YCpP4xAuT94wFI/aAB1fxtAZL8QgF4/CQBjPwTAcn8' +
'BAEi/fYAlf3mABv+zwCp/rUAPv+NAMz/TABFAP3/qgCg//kALv8lAar+LgEY/hYB' +
'e/3bANf8gQAy/A4Ak/uH/wD78f57+lP+DPq1/cL5Jv2l+a38rvlN/OT5EPxO+gH8' +
'5/oZ/LD7X/yp/Nz8x/2D/Qb/Tv5eADv/xAFDADIDXwGdBIgC+AWwAzcHywRSCM8F' +
'QAmyBvIJZQdhCuAHiwogCGkKIAj4CdkHOQlKBzQIegbwBm4FdAUsBMcDuQLwASAB' +
'AwBz/xD+vv0e/An8Pvpo+n/46Pjz9pX3p/WA9pr0rPXW8yH1bvPt9GLzEfWw84v1' +
'UvRV9kT1a/eL9tD4Fvhw+tb5PPzD+y3+zP0uAOP/MAL9AScEBgQEBu0FtQelByYJ' +
'IglPCl0KLQtLC7UL5QvhCygMsgsWDCgLrgtICvUKGwn0Ca8HsggJBjcHMwSSBUYC' +
'zANNAPgBVv4qAHf8aP69+r78Nfk5++j33fna9rj4GfbT96z1MveR9df2y/W89k/2' +
'3/YZ90X3Jfjg92b5qvjP+p35Vvys+ur90PuA///8CgEu/nwCUv/JA2YA6gRlAdYF' +
'QAJ/BvkC6gaUAx0HCAQRB1YEzAZ/BFMGhASpBWwE2QQ7BOoD+APtAqoD7gFOA+4A' +
'9AL7/6UCI/9VAmb+CgLL/c4BW/2fARL9dwHt/FwB8vxNAR/9QwFs/T0B0/03AU7+' +
'KQHT/hMBXv/xAOX/vgBeAHsAxgAjABQBtf9FATT/VwGf/kQB+v0OAUz9uACb/EgA' +
'6vvC/0D7Kf+k+ob+Hvrk/bf5Tf11+cX8W/lT/HL5A/y6+dj7MPrU+936Avy5+1z8' +
'wvzi/Pf9mf1L/3b+tQBw/y0CgwCpA6cBHgXSAnwG9QO+BwkF1QgEBrMJ0wZUCnEH' +
'sQraB8UKCAiNCvMHBgqXBzAJ+gYSCB4GswYFBR8FuQNWAz8CawGoAHX/Bf98/V39' +
'hPu1+6H5IPrp97b4afaC9yf1iPYx9NT1j/Nv9T/zVvVI85D1rfMf9mr0/fZ89SX4' +
'2/aR+X/4NftX+v/8Uvzi/mf+0wCGAMICmwKZBJwEUAZ9Bt4HKwgvCZgJNArCCu4K' +
'mgtTCxkMXAtDDA8LGAxuCpYLfQnHCkUIsQnRBlwIKwXRBmEDIQWDAV0Dov+NAcr9' +
'wP8K/AD+cPpc/Aj54fre95f5+PaE+Fv2svcP9iL3FfbS9mX2w/b69vb21Pdj9+f4' +
'BPgp+tb4kfvO+RH94PqZ/gL8IAAm/ZIBSP7kAmX/FQRwABYFYQHgBTUCcgbmAsUG' +
'dQPdBuYDwAYxBGwGUgTeBVYEJgVGBFAEIQRlA+oDbgKmA3IBWwN8ABADlv/GAsn+' +
'ggIa/kkCkf0YAiz97gHu/NAB3fy5AfP8pwEp/ZwBgP2MAe39dAFq/lkB9f4zAYH/' +
'+gADALEAfABSAOQA4v8yAWP/ZAHP/nMBKP5fAXf9LAG//NsACPxwAFb78P+w+l3/' +
'HvrA/qX5If5R+Y79LvkT/TL5qPxj+Vf8yfks/F/6Jvwr+078Kvyl/E39Iv2V/sj9' +
'/P+W/nIBgf/uAoMAZgSPAc4FnQIdB6YDRQiiBEAJhAUDCkIGgQrQBrcKKgenCk4H' +
'TAozB6IJ1wavCEIGeQdyBQIGZwRdBDADkQLWAakAXgC3/tn+xfxR/eH60fse+Wr6' +
'gvck+R72DvgB9TX3LfSc9qzzSvaF80b2tvON9j30IPcW9fv3PPYa+ar3dfpT+QH8' +
'Kvuv/SD9b/8n/zgBMwH/AjUDsgQeBUEG2QacB18IvwioCaMJpgo5ClYLfwq2C3UK' +
'vwsXCnYLawniCnwIAQpJB90I3QWFB0oEAgaYAl4E2ACnAhj/5gBh/Sr/wvuJ/U/6' +
'CPwP+a36CfiF+Uf3lfjN9t/3m/Zr97T2N/cT9z/3tfeD95f4Afiu+bD47fqF+Un8' +
'evq3/YX7Kf+d/JQAuf3wAdP+MgPf/0oE1QAxBbEB5QVwAmEGEAOjBo4DrQbkA30G' +
'FwQXBjAEhgUrBNEEDQT/A90DGAObAyECUQMqAQQDOwC1Alz/bAKY/iYC8f3oAWj9' +
'twEJ/ZEB0vxzAcD8YAHW/FIBD/1FAWH9PAHO/TEBT/4aAdj++QBk/80A6/+NAGMA' +
'OgDHANX/EwFd/0MB1f5YAT/+TgGg/SQB+fzbAFL8ewCz+wgAHvuG/5v6/v40+nf+' +
'7vnz/c35ff3U+R/9AvrZ/GH6sfzw+q/8rfvV/Jj8J/2r/aL93P49/igA+v6DAc//' +
'4AK2ADsEqgGLBaECvAaKA8gHZQSqCCoFWgnNBc4JRwb9CZAG5AmhBoMJdgbdCBIG' +
'8gd3BckGqQRpBawD2QODAicCPQFhAOP/iv54/rP8C/3x+q77T/ls+tf3UPmT9mH4' +
'jfWn99D0LPdf9PL2QfT/9nj0Vvf+9PP31vXU+PX27flS+Dr76fm3/Kn7Uf6G/fr/' +
'cv+qAV0BUQM9A98EAwVFBqAGfwcMCIMIPQlECSsKvAnNCuoJHwvKCSMLYAncCq4I' +
'SQq5B3IJiQZbCCcFEQehA6EFBAITBFsAcAKx/sgAGf0u/6H7pf1O+jX8K/ns+kL4' +
'0PmY9+n4Mvc9+Bb3y/c+95j3p/ei91H43/cx+U34Pvrt+HP7svnC/JP6Hv6O+4H/' +
'k/zYAJn9GQKk/kQDo/9GBIsAFgVfAbcFGgIiBrsCWQY6A1oGmQMkBt0DvgUEBC8F' +
'DQR8BAEErgPkA8wCtwPgAX8D9ABEAxIABwND/8YCiv6JAu79VQJ2/SYCIf3+AfX8' +
'3QHt/L0BBv2fAUD9hAGX/WgBA/5EAX3+FAH+/twAgf+YAP3/QgBsANz/ygBo/w4B' +
'5f41AVf+QgHB/TQBJv0GAYn8vQDt+1wAWfvp/9b6bP9n+ub+F/pj/un55v3c+XX9' +
'+Pkd/T764Pyx+sT8UfvN/Bn8+fwM/U39I/7J/VD/ZP6TACD/5AH1/zQD2gCBBMkB' +
'uwW0AtQGlAPIB2cEkgghBSsJuQWGCSYGnQliBnUJbQYKCUEGXQjeBXUHSQVRBnsE' +
'9QR6A3EDWQLTAR8BIQDL/2X+a/6s/Az9A/u5+3v5gfog+HH59/aJ+Aj21Pdh9WD3' +
'A/Uv9+/0QPcp9Zj3r/U2+H72FPmT9yv63fhw+1b63/z6+27+t/0LAID/qwFIAUAD' +
'AAO8BKYEGwYpBlEHdwdJCI0I/whlCXIJ9QmbCUAKewlEChMJ/AlhCHEJbwerCEYG' +
'rgfuBIMGcgM0BeIBzQNIAFUCr/7WACP9YP+x+/39aPq3/FX5lPt4+Jj61ffN+Xn3' +
'M/lk98r4jveb+Pv3nvim+ND4hfk0+ZP6v/nB+2f6B/0r+17+Afy1/9/8AAHD/TgC' +
'o/5SA3j/QwQ9AAgF8ACcBY8B/QUWAicGgQIeBtEC4AUFA3EFHgPXBCIDHQQYA0sD' +
'AgNpAuMCgQG+ApwAlQLA/28C9/5PAkr+MgK7/RgCTv0DAgX9+AHi/PcB6fz3ARP9' +
'9AFe/fABwf3kATX+zgG4/rABRv+DAdD/RQFRAPQAxACOACABGwBmAZf/jgH+/pUB' +
'Wf58Aa79RgEC/fYAVPyMAK37CwAY+3//mfru/jf6Xv72+dn91vli/d75AP0S+rj8' +
'dPqS/AX7lvy/+8D8ofwP/aj9h/3L/iT+BQDh/k0Btv+ZApwA3wONARQFgAIzBm4D' +
'MQdKBAMICQWnCKkFDgkcBjUJXQYgCWwGyQhCBjAI3wVbB0kFTwZ+BBQFhAOsA2EC' +
'IgIfAYUAy//h/nD+RP0Z/bX7y/s6+pH65vh/+cT3m/jc9u73NPaC9871V/ev9W/3' +
'2fXK90r2avgD9035+vdp+iX5tPuB+if9//ux/pT9SQA5/+kB3wB8A3wC9gQFBE0G' +
'aQVyB54GXQihBwQJbwhnCf4IgQlICU8JUAnUCBYJEgihCBEH9QfcBRMHeAQGBvQC' +
'2wReAZcDv/9FAif+7wCi/J//PPth/gH6N/35+C38LPhI+6H3jfpZ9wT6Wfep+Z73' +
'e/ki+H355fir+dv5/vn6+nP6OPwE+4z9rPvs/mb8SwAo/ZsB6/3SAqv+5gNi/9EE' +
'CgCKBaEADAYpAVoGnAFxBvIBSwYxAu4FYQJnBX4CuASHAucDhQICA3kCDgJnAhUB' +
'VAImAD8CRP8qAnf+GgLH/Q8CO/0LAtb8CQKY/A4ChPwXApn8HgLR/CMCK/0iAqD9' +
'FwIm/gYCvP7oAVj/uQHu/3wBfwAtAQEBxgBpAUwAswHC/94BKf/nAYL+zgHV/ZUB' +
'J/0/AXz8zwDZ+0oAQfu1/776F/9Y+n3+FPrs/fX5bP3/+QT9Mvq3/I76jfwW+4v8' +
'yPuw/KL8/Pyg/XH9tf4I/uL/xP4fAZv/XAJ/AJYDbwHDBGMC1AVLA8gGJQSUB+ME' +
'LQh9BZII8AW9CDIGrQg/Bl8IFgbSB7UFCwcgBQ8GVwTmBGADmQNFAi4CDwGuAMP/' +
'I/9r/pn9E/0f/M/7vvqm+n75oPlr+Mj4jPcl+On2wveF9qH3ZPbD94v2LPjv9tL4' +
'jvez+Wr4zfp9+RX8vPqC/R/8Cf+X/ZoAGv8oAqAAqQMZAgwFfANIBsYEVwfoBSsI' +
'2wa8CJkHCgkfCBAJagjOCHkIRghLCHwH4wd3BkcHPgWBBuADlQVmAoYE1wBlA0n/' +
'NgLH/QABWPzV/w77uf7v+bL9A/nJ/Ff4Afzr91z7wPfi+tf3kvov+Gz6xfhu+pT5' +
'k/qO+tz6sPtD+/D8vfs//kr8kf/k/NwAhP0UAiX+MAPA/igEU//2BNv/lAVQAPkF' +
'sQAlBgIBGgZEAd0FdQFwBZMB1QSjARgErAFBA6sBVgKkAWIBmwFvAJMBhv+PAbH+' +
'kgH4/ZoBX/2rAev8wwGf/OEBffwFAoT8KQKx/E4CAv1vAnH9hwL2/ZQCjP6UAi3/' +
'ggLO/1wCaAAhAvQAzwFsAWgBywHrAAwCWAAnArL/HwL//vgBQv6wAYD9SQHF/MwA' +
'Efw7AGv7nf/c+v3+aPpf/hb6zf3s+VD95vno/Ar6nvxi+n785/qF/JP7sfxl/AX9' +
'W/2D/W/+Jv6X/+T+ygC2/wICnAA4A4wBXwR6AmwFXANZBikEIAfbBLgHaQUcCMsF' +
'SAgABjcI/wXoB8UFYwdXBaoGuAS7BecDoATtAmED0QEIApsAnQBX/yn/Df67/cv8' +
'XPyb+xj7h/r3+Zz5/vjg+Dj4W/iq9xL4WfcI+Ej3Qfh097j42/dt+X34WvpR+Xj7' +
'U/q//H37Jf7B/J3/F/4aAXP/kQLPAPcDIgJBBV4DYgZ6BE4HcgUBCEAGdgjcBqgI' +
'PweQCGwHNAhoB5wHLgfHBsEGuwUpBoQEawUqA40EuAGZAz8AlgLJ/osBYf2CABL8' +
'gP/m+o3+5vmw/R758fyR+FX8Qfje+zP4iftk+Ff70vhI+3X5WvtI+oz7Q/vY+2D8' +
'O/yR/bD8zv4z/QwAvP0/AUP+WgLH/loDRv80BLb/3wQaAFsFbwCnBbIAvAXmAJ4F' +
'CAFQBRwB2QQnAUIEJwGIAx4BtAISAdYBAgH1APcAGQD0AE3/+ACU/gMB9f0YAXb9' +
'NAEb/VoB5fyFAdP8tQHn/OsBIP0gAnj9TgLn/XMCaf6LAvT+lQKE/48CFAB1ApwA' +
'QgIUAfUBcwGSAboBGQHlAYsA8AHr/9kBPP+hAYT+TQHI/eIADv1gAF/80f/A+zv/' +
'Mvuj/r76FP5s+pT9P/op/Tv61/xi+qf8s/qb/C/7s/zU+/P8nvxZ/Yv95f2R/o3+' +
'qf9O/9EAJwD8AQ0BHAPzAS0E0wIpBaQDCAZhBL8GAAVGB3QFnge/BcEH3AWqB8MF' +
'XAd3BdkG+wQiBk0EOwVyAywEcgL/AlgBuQEpAGIA7f4H/7L9sf2A/Gr8Zfs8+2r6' +
'MfqW+VL59vik+I34KPhc+OX3afjc97P4D/g5+Xr4+PkZ+ez66fkP/OH6UP38+6j+' +
'MP0PAG/+dwG1/9gC+wAlBDQCUQVWA1IGWQQhBzcFuAfrBRMIbQYrCLoGAAjaBpkH' +
'ywb4BocGHAYWBhMFgAXkA8gEmQL4Az8BFAPc/yMCf/4vATP9PAAA/Ff/9fqE/hn6' +
'yP1v+Sj9/fil/Mb4QvzL+AD8Cfnb+3r52vse+vn78Pou/OT7efzy/Nj8Ef5A/TP/' +
'r/1RACX+ZwGY/mYCAv9DA2b//gO//44ECgDyBEgAKwVzADEFkQALBaUAvQSrAEUE' +
'qACuA6MABQOZAEkCjACBAYcAuQCHAPn/iwBD/5kAof61AB3+2gC0/QsBav1DAUP9' +
'ggE//cYBWf0JAo79SgLe/YYCRP62Arb+1gIy/+cCsP/iAioAwwKZAIwC+AA/AkQB' +
'1QF2AVMBjAG/AIoBEwBpAVn/MAGc/uQA2f1/ABn9CgBk/I7/vfsM/y77j/67+hj+' +
'Z/qv/T36X/06+ij9YfoN/bf6Fv05+0H94vuN/bD89/2d/YD+ov4l/7r/3P/eAKAA' +
'BgJrASMDNAIvBPMCJgWmA/wFPwSsBrcELgcRBXsHQQWQB0AFcAcSBRcHuASKBjME' +
'ywWDA98ErgLPA7sBoAKzAFsBnf8KAID+t/5m/W/9XPw4/Gj7G/uQ+iT64vlW+WD5' +
'ufgQ+VL4+fgj+Bn5L/hy+XX4Avru+ML6mPmt+276vfxp++r9hfwq/7P9cADu/rcB' +
'LAD3AmIBHgSLAicFmwMJBoYEuwZOBTsH7QWDB1wGjQebBl0HqQb2BoUGWgY2Bo0F' +
'vQWTBB4FeQNjBEoCjwMIAakCv/+/AYD+0gBR/ev/OvwQ/0f7Rv55+pX93fkB/XT5' +
'h/w8+TH8Pfn5+3L54PvX+er7bvoP/Cz7SvwJ/J/8A/0A/Qn+af0U/9z9IQBQ/iQB' +
'w/4UAjD/6QKR/50D5P8vBCoAmQRhANcEhwDnBKQA0AS3AJUEvAA0BLoAtgO2ACID' +
'rgB3AqYAwQGfAAgBoABSAKsAp//AAAz/4QCG/gcBFv43Acb9cgGV/bEBf/3xAYf9' +
'LQKp/WUC4f2VAi7+tgKI/ssC7/7OAl3/tQLE/4QCIwA/AnsA3wHFAGcB+QDZABcB' +
'NwAdAYb/DAHI/uQABv6nAEX9WgCO/AEA4/ue/077Of/U+tT+d/py/kL6H/41+t79' +
'Tvqw/ZX6nv0J+6f9p/vK/W38DP5T/Wr+Uv7h/mj/bf+NAAsAtQG0ANUCYQHsAxEC' +
'7AS6As0FUAOMBtYDHQdABHoHiASlB60EmAetBFIHggTWBi0EJwayA0sFEwNFBFAC' +
'HANyAdsBgwCMAIf/Ov+I/un9i/2n/Jj8fvu9+3T6/PqU+Vz64/jn+WX4o/ke+JH5' +
'D/iv+Tr4/vmh+ID6Ovkv+/z5A/zq+v38APwW/iz9QP9k/m4Aov+cAd4AwgIMAtMD' +
'IgPHBBwElwX5BEAGqwW6BioG+wZ7BggHnAbeBosGfwZOBvAF5QUzBVYFTgSoBEkD' +
'4QMsAgQDAgEeAtT/NgGs/k8Akf1x/4z8pf6l++794/pU/U/62Pzo+Xf8svk3/K/5' +
'Fvzd+RP8OPor/L/6W/xq+6H8Nfz3/Bn9WP0M/sL9B/8v/gIAmv7yAP7+0wFb/54C' +
'q/9LA+//1wMkAD4ESgB9BGIAlARyAIYEdwBTBHQA/wNsAI4DZAAFA2AAawJeAMUB' +
'ZQAaAXcAcwCRANP/uABA/+oAv/4lAVT+aAH//bIBxf39Aab9RwKj/Y4Cu/3MAur9' +
'+gIp/hgDdv4kA9L+GAMy//ICkP+1Au//WgJEAOIBiABTAb0ArwDhAPr/7gA5/+gA' +
'bv7PAKL9pADa/GkAHPwfAHH7y//g+nP/avoZ/x36yf75+YL++vlC/in6Ff6H+gP+' +
'EPsJ/sL7J/6a/F3+kP2p/qD+C//F/4T/9AAMACMCnQBIAzMBWwTJAVUFWQIsBt0C' +
'1gZMA1UHqAOkB+kDugcJBJkHBwQ/B+EDrQaYA+sFLgP8BKEC5gP4AbQCOQFvAWYA' +
'HgCJ/8z+qv6D/cz9Sfz0/C77M/w5+o37a/kD+874n/pm+GP6M/hQ+jr4bvp6+Lv6' +
'7vgx+5P5z/tj+pP8WPt2/Wv8cf6P/Xj/wP6GAPj/mAEnAZ8CQwKRA0sDawQ1BCQF' +
'+QS3BZcFIgYFBlgGRAZdBloGNAZABtcF+QVLBYsFmQT8BMQDUgTSAo0DygG7ArcA' +
'4gGh/wYBjv4yAIr9av+a/K3+xfsI/hf7ff2Q+gr9NPqz/Ab6evwH+l/8OPpd/JP6' +
'cvwV+538u/vb/ID8J/1c/Xv9R/7T/Tf/L/4oAIn+EAHc/ucBK/+rAnH/VQOr/90D' +
'2f9CBP//ggQcAJ8EMwCWBEUAaQRSABkEWwCqA2QAJANxAIwCggDmAZwAOQHBAI4A' +
'7ADo/xsBS/9TAcD+lQFJ/toB6P0fAqH9YwJz/aICYf3ZAmv9AwOL/RwDvv0iAwT+' +
'EgNU/uoCrf6rAg7/UAJt/90BxP9VARYAtwBdAAYAkgBJ/7gAhP7OALz90QD5/MUA' +
'QfyrAJX7fQAB+0QAjvoJADv6yv8M+ov/B/pS/yv6H/98+vf+9/rd/pj70/5k/OD+' +
'Uv0C/1r+NP91/3j/mQDK/8EBKADmApEA/gP9AAAFbQHjBdoBngY9Ai4HkAKNB9AC' +
'uAf+Aq0HFANpBw0D7gbpAkMGqQJpBU4CaATcAUQDUgEHArEAvAAHAGn/VP8X/pv+' +
'0/zn/aP7Ov2T+pz8rvkY/PX4sPtu+GX7Hvg8+wP4Nvsj+Fj7ePif+wL5DPy++Zv8' +
'nvpE/aL7Cf7D/Of+9P3M/zD/uABtAKMBnwGFAr4CVwPFAxEEqwSuBGoFJwX+BXoF' +
'ZwamBZ8GpQWoBnkFhAYjBTcGpwTCBQYEJgVEA24EaQKiA34ByAKJAOUBkv//AJz+' +
'HgCw/Un/2/yE/h780/2A+zv9BfvA/LL6Y/yH+iH8hvr++7H6+vsF+wv8efsw/A38' +
'avy8/LT8g/0O/V3+bf05/9D9FgA2/vEAk/65Aev+bgI9/w0Dhv+NA8j/8QP//zQE' +
'LgBUBFwAVQSHADcEswAABOUAtwMbAVwDWQH0AqABhQLvARICQwKdAZMCIgHfAqYA' +
'KQMyAGcDwv+eA1//zgML/+0DxP78A4/++QNp/uEDUf6vA0f+UwM4/tECJv5AAiX+' +
'oAEy/uwAQ/4lAFr+Uv9x/nP+gP6L/Yj+pfyR/sb7lf7w+pD+MfqL/o/5hf4J+Xr+' +
'qPhv/nb4a/5z+HH+oPh//gH5lv6W+b3+XPr0/k77Ov9l/I3/oP3u//z+YwBqAOQA' +
'3gFrAVQD+wHBBI4CGAYeA08HpQNdCB8EOgmHBOAJ2QRICg8FagojBUsKFgXoCegE' +
'PgmUBFQIGwQwB4AD2AXEAlQE6QGuAvYA8gDy/yr/4f5k/c79q/u//Ar6uvuQ+Mj6' +
'Rffz+TL2QPlb9bL4yPRP+IL0I/iG9Cv40fRm+Gb11vg+9nb5VfdI+qP4R/se+mj8' +
'wPuq/Xb9/v4z/1oA+AC/AbQCHgNYBGwE2wWhBTEHsAZYCJUHSAlKCPgJyQhnChEJ' +
'kgobCXsK6AgoCnsImQnXB9QIAAfdB/gFvAbJBHwFgAMlBCICwQK4AFYBSv/q/+D9' +
'iP6H/Dr9S/sM/DP6+/o/+Qz6ePhG+eb3qfiK9zn4ZPf393X34ve79/b3Nfgu+Nr4' +
'ifim+Qn5mPqm+af7W/rK/CL79v33+yX/2fxTAMD9dgGp/ocClf+CA38AYwReASEF' +
'LQK3BfQCKQaxA3gGWgSbBvIEmwZ3BXkG5AUyBkAG0AWIBlUFtwbDBM0GIgTJBnYD' +
'qgbBAnIGBwIbBkoBqAWQABwF3v91BDb/twOX/uMCBf72AX799gAE/er/m/zT/kD8' +
'tP3w+5j8sfuC+4L7d/pe+3/5SPuj+EL75fdK+033Xvvg9oT7ova4+5X2+vu+9kz8' +
'H/eu/Lf3Iv2F+Kf9hfk8/rT64P4K/I//gf1JABP/DQG0ANUBXAKeAgEEZgOWBScE' +
'EgfdBGsIggWZCRMGkgqMBk0L5QbFCxoH9QssB90LFwd6C9gGzAprBtkJ0wWmCBYF' +
'NgcuBJUFJAPQAwAC7gHEAP3/e/8G/if+FvzP/ED6hPuM+Ez6Bfcx+bX1N/il9Gb3' +
'3vPI9mHzYvY08zb2WPNI9svzl/aM9Cb3k/Xw99j27/hX+CP6Afp/+8v7/Pyv/ZP+' +
'nf83AIgB4gFmA4UDKgUTBcgGgwY2CMsHawnlCGQKxwkXC2cKhgvFCq4L4AqNC7UK' +
'JwtDCoAKjQmfCZoIiQhzB0cHHAbiBaEEZQQLA9UCYwE+AbD/qv8E/ib+bPy4/PD6' +
'Y/uU+TP6aPgx+XP3Wfi29rD3N/Y69/j19/b49eb2OPYE97P2Tvdk98P3R/hc+FP5' +
'FfmB+un5yvvR+iL9zPuD/tL84f/c/TYB6/57AvX/pwP3ALEE8AGWBdkCUgayA+QG' +
'eARKBysFhAfJBZIHTwZ2B7oGNAcKB88GPgdLBlcHrAVTB/YENAcyBPcGYgOcBokC' +
'KgayAZsF3gDxBBEALQRN/1ADkf5fAuL9XAFD/UwAt/w1/z38F/7T+/j8efvc+zD7' +
'zPr5+tD51Pro+L76Gvi1+nD3vvrt9tf6m/YC+3f2PPuF9ob7yvbi+0L3Tfzz98/8' +
'2vhk/e75B/4u+7n+k/x3/xj+RACy/xsBUgH0AfkC0AKbBKwDKAZ+BJoHRQXnCPoF' +
'AwqWBugKFgeQC3cH8QuyBwgMvwfZC6UHYQtgB50K6AaXCUYGUQh2Bc8GeQQhBVwD' +
'UAMiAmYBzgBw/23/eP0D/oz7mfy7+Tv7D/jw+ZD2wvhM9bv3SfTg9o/zOfYn8871' +
'D/Ok9UXzufXM8xL2oPSs9rn1hfcT95n4oPjg+Vr6Ufs1/Ob8I/6R/hcASwAKAgsC' +
'7QPDA64FYgVIB+AGrgg0CNcJVAnECjsKbAvhCswLPwviC1ULsAsgCzoLpQqCCuMJ' +
'igneCGIIpQcRBz4GngWvBBMEBQN6AkwB3ACP/0T/1/27/TH8Svyr+vr6TvnQ+SL4' +
'0vgp9wH4a/Zi9+719Pay9br2uPW19v/13/aC9jf3Pve79yv4ZPhB+S/5ffoR+tH7' +
'Bfs0/Qz8n/4e/QQAMv5bAUb/oQJWAM0DXAHXBFUCuAVAA3EGGgQAB9sEXgeEBZAH' +
'FAaYB4oGdgflBi0HJwfDBkwHOgZTB5gFQAfjBBAHHQTABkoDWAZ3AtgFpwE9BdcA' +
'iQQOAMEDUf/kAp7+8gH2/fQAXv3s/9f82/5h/Mf9+/u0/KP7pvtZ+6b6H/u5+fb6' +
'5Pjc+i340vqZ99j6Kffq+uT2DfvR9kX76vaI+zX32/u490T8bvi+/FL5Sf1h+uT9' +
'l/uM/vH8Rf9o/g4A8f/iAIcBvgEdA5sCqAR0AyEGRQSABwwFugjEBcUJZAaZCugG' +
'NAtOB4wLjgegC6YHbAuUB/IKVQczCugGNAlMBvgHhAWFBpME5AR+AyIDTAJLAQEB' +
'Z/+m/4H9Qf6k+9v84fmB+0P4OvrQ9g75l/UI+J70L/fs84j2g/Mb9mfz6/WZ8/31' +
'FvRN9t703Pbu9av3OPew+Ln46vll+k/7LvzU/A3+c/73/yIA3QHTAbIDewNsBQ8F' +
'/waBBmMIyweTCeYIhArHCTELaAqYC8QKuQvaCpILqgopCzcKfQqBCZcJjQh8CGQH' +
'NQcOBskFkwRDBP4CrQJbARMBtf98/xX+8f2G/Hr8Efsg+8P57fml+OP4ufcF+AT3' +
'WveM9uX2Vfaj9lv2kvaZ9rb2EvcL98L3i/ee+DT4pPn9+Mf64fkA/OD6S/3u+5n+' +
'B/3j/yb+IgFF/00CYwBkA3cBXQR7AjEFbgPfBUsEYwYRBb4GvwXyBlIG/QbIBuAG' +
'IQehBlwHRAZ4B8wFdAc8BVQHnAQXB+wDuwYyA0MGcwKwBbIBBwX2AEsEQgB5A5X/' +
'lgLz/qMBW/6jAM79mf9L/Y3+2fyB/XX8efwd/H770vuR+pT7tflg+/P4PPtO+CX7' +
'yvcb+273Ivs49zX7LfdW+1L3ifur99H7NPgu/Ob4mvzD+Rf9y/qp/ff7Tf5E/QT/' +
'pv7J/xcAmACSAXEBDANNAn4EKQPeBf8DIgfMBEMIiwU4CTMG/AnABooKLQfYCnUH' +
'5gqUB7MKhwc/Ck0HjAnlBp0IUQZ3B5IFIAamBKAElQMAA2UCSQEbAYb/vv/B/Vf+' +
'CPzz/Gf6m/vj+FT6h/cl+WH2Hvh29UX3yvSd9mP0LvZE9P31a/QM9tb0W/aH9ev2' +
'eva396X3u/gE+fX5jfpc+zb85fz0/Yb+vP80AIAB5AE1A4kD0gQaBVEGiwalB9MH' +
'xwjoCK4JwwlYCl0KxQq1CvEKyQrYCpMKfQoXCukJWwkdCWIIGggvB+8G0wWlBVgE' +
'QATDAsoCHwFKAXf/yv/X/VX+S/z0/N76rvua+Yb6hPiB+Z73p/jz9v73ifaD9172' +
'N/dw9h/3v/Y490j3fPcD+On37Ph++Pv5Nvkm+wv6Z/z2+rP98/sB///8SgAT/oYB' +
'KP+rAjgAtQNAAZ0EPAJgBSsD/QUDBG4GxASyBnEF0QYDBskGdgaZBs8GTQYJB+EF' +
'IwdcBSIHxgQDByIExwZxA28GuwL7BQMCawVOAcUEnwAKBPj/PQNa/10Cx/5wAUH+' +
'eADH/Xr/XP19/v78gP2r/Ir8ZPyg+yn8xvr3+wH60ftT+bP7v/id+074lfsC+Jf7' +
'2vek+933vvsH+OX7Xfga/N74YvyH+bn8V/ok/U/7o/1m/DT+mv3X/uD+iv8yAEoA' +
'jQEXAecC6QE3BLwCdgWPA50GXASlBx0FhQjMBTcJYQa1CdcG+wkrBwsKXQffCWMH' +
'dQk4B9EI4Ab2B1sG5gapBasFzARKBMYDygKfAjQBXwGW/w8A9v2y/lz8UP3V+vf7' +
'bPmu+ir4f/kZ93X4O/aU95b14/Yy9Wz2D/Uv9i/1MvaT9Xj2N/b89hf3vPcr+LX4' +
'bvnh+dn6Ovti/LT8AP5H/qn/7P9RAZYB7QI3A3QEwgTfBTIGIgd6BzYIkwgVCXEJ' +
'uQkPCiQKbQpPCocKOgpaCu0J7QljCT4JoQhOCLMHLgeaBt8FWgVpBAUE3wKhAkgB' +
'NQGt/8j/Gf5j/pn8EP05+9f7/Pm8+ur4yPkN+Pr4ZvdW+Pf24ffF9p330PaL9xf3' +
'pfeV9+n3QfhV+Bb56fgU+p/5Lvtu+lv8U/uT/Un8zf5K/QIAVP4tAVv/QwJdAD0D' +
'WQEaBEoC1wQqA28F9gPhBaoELAZGBVEGyQVTBjAGMwZ8BvUFqwacBbsGKQWyBqcE' +
'jQYXBEwGfAP0Bd8CgwU/AvkEnQFaBP0ApwNkAOQC1P8UAk3/OAHP/lMAWf5o/+z9' +
'ev6H/Y79LP2r/Nv80fuS/AT7UPxI+hb8pvnm+x35vvuz+KD7aviP+0b4ivtH+JL7' +
'b/ip+8L41ftB+RX85fll/K76yvyb+0X9pvzV/cv9eP4F/y//TQD0/5cBwQDiApcB' +
'JgRyAlcFSgNyBh4EbgflBEQImQXxCDgGagm7BqkJFwevCUwHfglXBxQJNgdvCOcG' +
'lQdpBogGvwVQBeoE8wPuA3sC0gLwAJwBWf9RAMH9+/44/KX9wvpU/GX5EPsy+Oj5' +
'Lvfg+F72/vfM9VH3dvXX9mH1l/aP9ZT2//XP9q72RveT9/f3rfjf+Pb5+/le+zz7' +
'4fye/Hz+IP4eAK//uwE/AUkDyQK+BEEEEwaeBT8H2AY+COUHBwm9CJYJWgnpCbsJ' +
'/QnaCdUJuQl1CVsJ2wi8CBEI6AcdB+YGAQa4BccEaAR3A/8CGgKJAboADwBa/5j+' +
'BP4v/cT84fuf+7b6m/qz+b353/gH+Tz4e/jL9xn4j/fm94r34ve99wv4Ivhb+LH4' +
'zvhn+WT5QfoZ+jf75/pB/Mj7V/22/HL+rv2L/6r+nQCl/6ABmwCPAocBZANlAhwE' +
'NgO3BPIDMAWYBIYFJwW8BZ8F0gX6BckFOwajBWMGZAVyBhAFZQanBD4GMQT+BbED' +
'pgUlAzcFlAKwBP4BEwRnAWYD1ACqAkYA3wG8/wkBN/8rALj+S/9C/mb+0f2C/Wn9' +
'p/wL/dP7s/wN+2L8Wvoc/L754Ps9+a/72/iK+5j4cft3+Gf7ffhu+6z4h/sF+bX7' +
'iPn4+y/6Tvz8+rn87Ps7/fb80f0X/nn+TP8x/4sA9P/SAcYAGQOiAVMEfQJ7BVMD' +
'iQYiBHUH4wQ7CJIF1AgnBjwJngZsCfMGZAkgByQJJgerCP8G+gerBhcHLgYFBoUF' +
'ywSyBG8DvAP6AagCdQB8Aev+PgBl/fb+6vut/YL6afw++Tn7I/gh+jn3JvmD9lL4' +
'B/ar98r1OffN9f72DPb69or2MfdE96L3NPhL+Fb5J/md+i/6BPxg+4P9sfwP/xv+' +
'mwCP/yECCQGcA4MC+QTpAzMGNAVGB2EGJwhkB9UINghLCdEIhgkzCYUJWglLCUUJ' +
'3Aj2CDoIbghlB68HaQbCBk0FrQUYBHcE0wIqA4MBzAEzAGoA6/4K/6v9sf2F/HP8' +
'f/tU+5X6U/rR+Xr5MvnO+L74Uvh3+Ar4Wvjx92r4D/ij+F74/fjU+Hn5cPkT+i76' +
'w/oJ+4z7//tm/AX9Rv0M/iz+FP8V/xoA/P8VAdwAAAKxAdYCegKWAzMDOwTaA8ME' +
'bAQqBekEcwVPBZ8FnwWrBdgFnAX5BXQFAAYzBfAF3gTKBXgEjAUCBDYFgAPLBPYC' +
'TQRlAr4D0gEcAz4BaAKpAKgBFwDbAIb/BQD4/iz/c/5Q/vX9dv1//aP8Ev3Y+638' +
'GvtS/G76Afza+bv7X/mB+wL5VfvK+Dv7tPgw+8H4Nfv5+FL7WPmC+935xvuK+iL8' +
'WfuV/Ev8H/1c/cD9gf5w/rf/MP/0APv/NALSAHIDsQGjBI8CvgVnA74GOASdB/oE' +
'UQinBdYIOQYpCa4GRQn+BigJKQfUCCsHRggAB4IHqQaOBigGawV5BSMEpATAArAD' +
'SAGfAsX/dQFA/joAwvz1/lb7sP0E+nL81PhD+9L3LvoD9zr5bPZs+BP2zff29V/3' +
'F/Yl93v2Jvca91/37PfN9/L4cvgm+k35fftU+u38gPtr/sj88f8o/ncBmP/uAgsB' +
'TwR2ApMF1QOxBhsFnQc9BlcINAfdCP4HKwmVCD0J8ggXCRcJuwgDCSwItQhvBy8I' +
'iAZ2B38FjwZdBIMFJgNVBOYBEQOnAMABaf9oADf+E/8b/cv9FvyV/C77e/to+oP6' +
'x/mx+U/5CvkA+ZL42fhM+Nr4NvgA+U/4SfmV+LL5Bvk2+pz50vpT+oL7JPtA/Az8' +
'CP0C/dn9Av6v/gb/gP8DAEsA9wAQAd4BywGxAnoCbgMZAxEEpgOVBCME/ASPBEgF' +
'5gR2BSgFhQVYBXwFdAVZBXsFHgVtBcwESgVpBBYF+QPPBH4DcAT2AgEEagJ+A9gB' +
'6gJBAUoCrwCaARwA3ACK/xUA/v5F/3X+df71/ab9f/3Y/A39Evyn/Fv7Tvyy+vz7' +
'H/q3+6f5gvtK+Vz7DflF+/P4QPsC+U77N/lv+5P5pvsX+vT7wPpU/I77yvx5/FP9' +
'gf3v/aT+oP7V/1//DgEnAEsC+AB/A8kBpQSbArkFagOtBi0EgAffBCkIfAWiCP8F' +
'5whmBvUIqwbMCMsGbAjGBtUHmAYLB0IGEQbCBe4EGwWqA1MESQJoA9gAYwJg/0sB' +
'5f0hAHX87v4f+7795fmW/M74fPvk93n6LfeT+a/20vhr9jr4ZPbQ95v2mvcO95j3' +
't/fL95T4M/if+c340fqW+ST8i/qJ/aL7+/7V/HMAI/7hAXr/OwPVAIIEMAKoBX0D' +
'pAayBHUHzAUVCMMGfwiLB7MIJAiyCIwIegi6CBAIsQh4B3IItgb+B9EFWQfPBIcG' +
'uAOQBZYCewRqAUkDPAAEAhT/tgD8/Wn//Pwo/hL89vxG+9v7n/rg+hj6Bvq0+VP5' +
'dvnO+F35dvhp+U74lvlU+OH5ifhI+un4xfpu+Vr7F/oA/OD6sPy/+2j9s/wn/rH9' +
'5/6z/qb/t/9iALUAFgGkAb4BgQJcAksD7QL8A24DkAThAwkFRQRjBZgEnQXbBLsF' +
'CgW6BSgFngUzBWgFKQUZBQ0FtwTeBEMEmwS+A0YEMQPcA5oCXQP6Ac8CVQEvAq8A' +
'gQELAMYAa/8CAND+Nv8+/mb+tP2T/TL9xvy8/AX8VfxQ+/z7qvqx+xv6dfuo+Ur7' +
'Uvkx+xz5KvsO+Tf7J/lW+2X5iPvK+dD7V/os/Av7m/zl+x792Pyv/eX9UP4K/wD/' +
'PQC7/3QBfgCqAkQB1gMJAvQEzQL6BYkD4AY4BKAH2AQ2CGQFmwjWBcoILAbGCGMG' +
'igh2BhUIZQZsBzAGkgbUBYwFVAVjBLUEGwP1A7wBGANPACEC2/4YAWz9AwAK/Of+' +
'w/rP/Zr5vPyW+LX7xPfF+iT38Pm79j75j/az+J72UPjo9h/4bfcd+Cb4SvgQ+an4' +
'I/o4+Vj78Pmq/NH6Dv7U+3v/8vzmACX+SQJn/5sDrwDRBPIB5gUrA9MGUQSRB1sF' +
'HghEBngIBQeeCJwHjAgCCEgINgjVBzgIMwcECG0GnweEBQsHfARNBmUDawVAAmYE' +
'FQFIA+7/HQLP/uYAvP2s/778eP7a+1L9FftB/G76Sfvu+XP6kvnD+Vj5N/lG+dj4' +
'Wfmo+Iv5o/je+cv4S/oc+dL6lPlu+zH6GPzp+tH8vPuT/aD8WP6R/SD/jv7m/4v/' +
'pgCBAF4BcAEMAlECrAIcAz0D0APAA2wEMQTsBJAETQXeBJEFGQW2BT8FvQVTBacF' +
'UQV0BTgFJgUNBcUEzgRQBHwEyQMVBDQDmwOSAhID6wF6AkAB0QGSABkB5P9ZADv/' +
'lP+b/sn+AP78/XH9Nf3w/HX8e/y++xT8F/vA+4P6ffsG+k37pvkv+2P5I/tA+S37' +
'QvlN+2j5gPu1+cj7KPok/L/6kPx3+w/9Tfye/UD9Ov5N/uX+av+a/48AUwC4AQ4B' +
'3wLJAf4DgwILBTUD/AXZA9EGbwSCB/IEBQheBVwIsQWBCOcFdAj/BTMI+AW7B8wF' +
'EweABT4GEgVBBYUEIATfA98CGwOMAT4CLABSAcf+WABo/Vf/GPxW/tv6WP2++WT8' +
'x/iC+/z3ufpn9w76CPeB+d32Gfnq9tr4MvfG+LD33fhh+B75Q/mN+U36Jfp4+9/6' +
'wPy9+xf+tvx0/8X91QDi/isCBgBvAysBnwRPAq8FZgOXBmcEUwdKBd4HDwY5CLIG' +
'YQgpB1gIdAcbCJIHrQd/BxUHPgdXBtEGdwU9Bn4EhAVtA6gEUQKzAy8BrAILAJMB' +
'8P52AOb9Wv/r/ET+Bvw5/UH7Rvyb+mv7Fvqu+rf5Evp8+Zz5ZPlO+W/5Kfmc+Sz5' +
'6PlW+VD6pvnQ+hj6Zfuq+gz8WPvE/Bv8hP3x/En+1f0R/7/+1v+o/5UAjABMAWcB' +
'+wE4AqAC+gI1A6YDugM5BCwEswSOBBEF3QRUBRcFewU8BYUFTQVzBUgFRwUxBQMF' +
'AwWnBL4EOARoBLoDAAQqA4QDjgL3AukBWwI+Aa8BkAD5AOL/OwA2/3f/kf6u/vX9' +
'5f1h/SL92fxp/F/8uvv3+xr7oPuO+lz7Gvoq+8L5EPuI+Qz7b/kc+3n5Qvul+X/7' +
'9/nS+276O/wH+7f8wPtD/Zb83v2G/Yf+i/47/57/9P+6ALIA2AFxAfECKwICBOEC' +
'/gSLA+EFJgSmBrAERQchBb0HeQUHCLYFIAjUBQoI1AXBB7QFRwd0BaEGFAXNBZYE' +
'0gT7A7gDRgOFAnwCQAGjAfD/ugCe/sn/U/3X/hf86f30+gb97/kv/Az5avtV+L/6' +
'zfcy+nn3xvlZ93v5bvdW+bv3W/k8+Ib56fjX+cP5TvrE+uf64/ug+xf9cfxb/lr9' +
'rP9X/vsAXv89AmQAawNpAYMEaAJ8BVYDUgYwBP4G9AR8B5cFywcXBuwHdAbcB6wG' +
'mwe9BiwHpAaZBmQG4QX/BQkFeAUaBNYEGAMVBAkCPQP5AFkC6P9oAd3+cQDh/Xv/' +
'9vyH/iP8of1s+8781PoO/F36Z/sH+tz60vlv+sH5IvrP+ff5/vnu+Uv6CPqy+kH6' +
'L/uY+sH7C/tj/Jn7EP07/Mj97/yH/rL9Rf98/gEASv+3ABcAZQHeAAsCoAGkAlYC' +
'LQP/AqgDlQMOBBMEZAR9BKoE0QTcBAsF+QQsBQIFMwX3BCAF2AT1BKUEsARgBFYE' +
'BwTpA50DbAMkA+ECnAJIAggCpwFkAfwAtQBMAAIAoP9I//L+i/5H/tT9qP0h/RL9' +
'dvyK/Nf7EvxI+6v7zPpZ+2b6Hfsb+vn67vnr+t759frx+Rz7Jfpa+3n6r/vy+h78' +
'iPug/Dr8Mf0I/dX97P2F/uP+QP/m/wIA7QDFAPcBhgH9AkIC9gPyAtwElgOrBSsE' +
'WwapBOkGEAVSB14FjQePBZsHogV+B5gFMwduBbgGIwURBrwEQwU8BFcEpQNMA/cC' +
'KAI2AvYAaAG3/40AeP6t/0H90P4a/Pf9DPso/Rz6afxN+bz7pvgm+y74q/rm90z6' +
'0fcN+u738fk/+Pj5v/gh+mz5avpA+tX6Nvtd+0r8//tz/bj8qv6F/ef/Yv4gAUX/' +
'TwItAHADFgF2BPkBXQXOAiIGlAPBBkYENAfeBHkHWwWRB7oFeQf3BTYHEgbKBgoG' +
'NQbeBYAFkgWuBCcFxQOgBM8CAwTKAU0DwACCArr/rwG7/tMAyf30/+z8GP8k/ED+' +
'd/t1/en6u/x6+hP8KvqB+/75C/v0+bL6CPp3+jv6WvqL+lv68/p7+nH7ufoD/BP7' +
'pfyH+1H9EvwG/q/8v/5c/Xf/F/4vANv+4ACh/4cBZQAnAikBuQLkATsDkgKsAzID' +
'DQTAA10EOQSbBJwExgTlBNwEFgXcBCsFywQlBagEBQVwBMwEJQR8BMgDFQRbA5oD' +
'4QIPA1YCdAK+Ac0BHwEgAXcAbQDG/7b/EP8B/1z+UP6s/av9Af0T/WD8ifzM+w/8' +
'Svup+9r6WvuB+iL7QvoD+yD6/Pod+g/7Ofo6+3f6fvvU+tr7UvtN/Ov70/yd/Gb9' +
'aP0J/kj+t/43/2v/NAAmADUB4gAxApcBKANHAhQE7gLqBIUDqQUKBEoGfATGBtYE' +
'HQcYBUwHQQVNB00FIwc6Bc0GCwVLBsEEoAVcBNQE4gPoA1ID4AKvAsIB+wGUADgB' +
'Yf9tADL+oP8N/db+9/sP/vj6U/0X+qX8W/kK/Mf4gvtf+BH7J/i8+iH4hPpL+Gv6' +
'ovhv+ij5kvrY+dX6rfoz+6L7rvuy/EH80f3o/P7+ov0zAG3+YwE//4QCFACTA+cA' +
'iwS3AWYFfwIbBjgDqQbeAw4HbwRHB+cEVAdEBTQHhAXpBqYFdgamBeAFiAUsBUsF' +
'XQTxBHgDfASDAu8DhAFKA4IAlAKF/9EBjv4EAab9MwDR/GP/FPyV/nD7z/3p+hb9' +
'gfpu/Dj62fsP+lv7Cfr4+iP6svpc+ov6rfqA+hb7kfqX+8L6KvwO+8r8dPt5/fT7' +
'MP6K/Oj+MP2h/+X9WACk/goBaP+zAS4AUgL1AOMCtgFkA2sC1AMTAzMEqQN/BCsE' +
'uASWBN0E6QTsBCEF6AQ+BdAEQAWjBCUFYQTtBAwEnQSoAzcEMwO7A64CKgMbAokC' +
'fQHbAdUAJQEmAGgAcf+o/7z+6/4J/jT+Wv2H/bT85/wZ/Ff8j/vZ+xn7dPu2+iX7' +
'avrv+jr61fop+tb6Nfrw+l/6JPur+nX7FPvb+5j7Vvw6/Ob89vyH/cf9Nv6r/u/+' +
'nP+v/5MAbgCNASsBhQLjAXMDkgJTBDUDHgXJA8wFRgRcBq4EzAb/BBQHNgUyB1EF' +
'JQdOBe4GMAWNBvcEBAakBFMFNwR+BLEDjgMaA4cCcQJrAbcBQgDzABb/KwDt/WH/' +
'0PyZ/sT71/3S+iH9/fl7/Ez55/vE+Gj7aPgA+zz4tPo++IX6cPh0+tH4gvpc+az6' +
'Efr0+ur6V/vg+9L77vxl/BD+D/08/8r9aACP/o8BW/+tAi0AtgP9AKcEygF7BZAC' +
'KQZEA7AG5wMNB3QEQAfrBEgHRwUhB4UF0wamBV8GqAXFBYoFDgVPBT0E+ARXA4UE' +
'YgL4A2MBVANkAKACZ//dAXT+EQGR/UEAvfxr/wL8mf5h+9D93PoS/Xj6Zvwz+sv7' +
'DvpG+wz63von+o/6YPpe+rb6Tvoh+1r6o/uG+jn80fra/DX7h/2y+zz+SPz1/vH8' +
'sP+t/WcAdf4YAUT/wAEXAFsC6ADqArUBaQN4AtgDLwM4BNcDgwRoBLkE3wTcBD4F' +
'6gSABeQEpQXIBKsFlwSRBVQEXAUABAsFmAOdBB4DFQSWAnYDAgLHAmQBCwK6AEIB' +
'DABxAFr/oP+n/tD+9v0H/kz9S/2r/Jz8FPz9+4/7dfsc+wX7vvqv+nr6d/pR+l36' +
'RPph+lb6g/qG+sL61foe+0D7k/vI+x/8bPzA/Cj9dP35/Tf+2f4C/8b/0v+6AKMA' +
'rQFvAZ0CNQKCA/ECVgSbAxcFMwS9BbMEQwYZBakGZwXmBpYF+galBegGmgWrBm4F' +
'QwYkBbcFwQQEBUQEMASuA0IDBwM/Ak4CKgGJAQwAuwDp/uj/zP0W/738Sv7B+4j9' +
'3vrU/Bn6MPx3+Z/7/fgl+6/4xvqN+IT6mPhe+tH4V/o1+W36w/mj+nj69/pM+2T7' +
'O/zq+0P9h/xY/jT9dP/w/ZIAuf6rAYn/uAJbALIDLQGUBPgBVwW4AvUFaANwBgcE' +
'wwaSBOwGBQXrBlsFwAaUBW4GrwX3BawFYAWKBa0ETAXiA/AEBQN6BBoC7AMnAUgD' +
'MwCTAkP/0AFe/gMBh/0xAMT8Xv8U/Iv+fvvB/Qb7BP2r+lX8b/q5+1P6NvtW+sz6' +
'dvp/+rL6T/oH+zz6c/tK+vP7dvqE/MD6I/0o+839qvt+/kP8Mf/w/OX/rv2WAHr+' +
'PgFN/9wBIgBvAvUA9gLGAXEDjgLXA0cDLATvA3AEhASgBP8EuwRfBcEEogWxBMUF' +
'jQTJBVcErgUOBHYFswMeBUQDqQTIAh0EPwJ8A6kBxwIKAQQCYwA3Abj/YgAM/4v/' +
'YP64/rn97P0Z/Sz9gvx6/Pn72vuD+1L7Ifvk+tX6kfqi+lv6ifpE+oz6S/qt+nH6' +
'7Pqz+kb7E/u++477UPwj/Pr8y/y4/YP9hv5H/mT/Fv9KAOr/MgG8ABYCigHzAk0C' +
'wgMFA4MErgMsBUQEuAXCBCcGKAVxBnEFlgabBZUGqAVsBpYFHQZnBagFHAUPBbUE' +
'WAQ2BIQDoAOZAvcCmwE9ApEAeAGD/6sAdf7b/3D9DP96/EP+mfuD/dH60fwm+i/8' +
'nvmh+z35LPsG+dH6+PiR+hT5bPpa+Wb6yvmA+l36tfoS+wb75Ptz+8z89vvI/ZD8' +
'0P49/dv/9/3nAL3+7AGL/+ICWgDGAycBkQTuAT8FrALMBVwDNQb6A3gGggSWBvEE' +
'jAZHBVwGgAUHBpoFkQWXBQAFeAVUBDwFkAPiBLwCbwTbAeMD9gBDAw8AkgIr/9EB' +
'Uf4JAYT9OwDI/Gn/Ifya/pH70f0c+xX9xvpr/Iz60/tx+lP7cvrq+pD6nvrL+nD6' +
'Hftd+of7afoH/JT6lfza+jL9PPvb/bn7jP5O/ED/9vz0/679qAB1/lcBRf/7ARYA' +
'kgLnAB0DtAGYA3cCAQQsA1cE0gOZBGIExQTaBNoENwXaBHoFxASfBZoEpQVaBI0F' +
'AgRUBZoD/wQhA5EElwIIBAECaQNgAbkCtQD6AQgAMgFa/2QAqv6R//39wf5Z/fj9' +
'v/w5/TX8jPy9+/P7Vvtt+wX7AfvQ+rP6sfp/+q36aPrH+nH6/PqZ+kv73fqz+zz7' +
'N/y2+9P8R/yC/e38Qf6j/Qz/Zf7f/y//twD9/44BygBgApMBJwNTAt8DBQOEBKgD' +
'EQU0BIIFqATXBQQFCwZGBR4GbQUOBncF2gViBYMFMAUKBeIEcwR5BMMD+wP6AmcD' +
'HQK/AjMBCgJAAEoBSv+DAFj+u/9u/fP+kvwx/sn7ev0Z+9L8hvo8/BX6uvvF+U/7' +
'mfn++pH5xvqw+av69vms+l76yfrm+gH7jftW+078xPsi/UX8Bv7a/Pb+gP3p/zT+' +
'3ADw/skBtP+pAncAdwM1ATIE8AHTBKECVAVBA7cF0QP2BUwEEwawBA4G/QTmBS8F' +
'nQVEBTYFQAWzBB8FFQThBGMDigShAh0E1AGZA/4AAAMnAFcCU/+jAYX+5gDB/SQA' +
'Dv1g/2/8of7k++f9b/s3/Rb7lvzZ+gj8t/qP+7L6LfvI+ub6+vq6+kP7qPqi+7L6' +
'GPza+qH8H/s3/X/72f33+4T+hPwz/yT95P/U/ZMAkP4+AVb/4wEgAH8C6gANA68B' +
'iwNrAvQDFwNKBLQDjQQ+BLoEsATQBAkF0ARHBbgEZgWJBGsFRQRRBeoDGAV/A8UE' +
'AQNXBHMC0QPZATYDNQGIAokAzgHb/wwBK/9CAH3+dv/W/a7+OP3u/aX8Of0i/JX8' +
's/sF/Ff7ifsS+yX75/re+tX6svrd+qT6APuz+j/73/qZ+yj7CfyK+5D8Bvwv/Zj8' +
'3f05/Zn+6P1g/6X+LABm//kAKQDDAeoAhgKlAT4DWALmA/4CeQSPA/UEDQRXBXUE' +
'nAXGBMIF/QTGBRgFqAUWBWwF+gQQBcQElQRzBAEEDQRUA5IDkwIEA8YBagLrAMQB' +
'BwATASX/XwBF/qn/bP31/qT8Sf7w+6j9U/sS/c76jPxn+hf8IPq3+/35b/v8+T77' +
'HPok+176JPvC+j77Qftu+9v7tvuP/BX8WP2K/C/+EP0O/6T98P9E/tIA7f6xAZ3/' +
'ggJNAEQD+wD0A6cBjQRKAgsF4QJqBWkDqgXgA8sFRQTMBZUErAXMBGwF6QQNBeoE' +
'lQTUBAQEowReA1gEpwL1A+IBegMUAe8CRABVAnL/qwGo/vgA6P1BADT9h/+R/ND+' +
'BPwf/oz7df0t+9n85/pM/L/61vuz+nf7wfou++v6APsv++36ivv1+v37GvuE/Fr7' +
'HP21+8H9J/xx/rD8Jv9L/d3/9v2UAK3+SAFs//MBLgCSAu4AIgOpAaQDWwISBAID' +
'bASWA7AEFwTcBIIE7wTTBOkECgXLBCMFlQQdBUoE/ATqA8AEdgNqBPMC+wNgAnQD' +
'wQHZAhgBMAJqAHsBuf+/AAj///9b/j//tv2E/hz90v2S/C/9Fvyb/Kz7GvxX+7D7' +
'Gvtg+/X6Kvvo+g/79/oQ+x/7LPth+2L7vfuy+zD8Gfy2/JP8T/0g/fn9u/2w/mL+' +
'bv8P/zAAv//1AHEAuAEeAXUCxAEkA10CwgPqAk8EZQPEBMsDIQUcBGUFWASJBXwE' +
'kQWIBHoFfgRDBVsE7QQiBH0E1QPyA3UDUAMDA5oCgwLVAfcBBAFiASwAyABS/yoA' +
'ef6L/6r98v7o/GD+MvzU/ZP7VP0N++L8o/qA/Fj6MPwt+vT7IvrM+zn6uPty+rr7' +
'yfrR+z37/PvO+zv8ePyP/DT98/wB/mf92f7o/bf/dP6WAAj/cQGi/0MCPwAIA9wA' +
'ugN2AVUECQLYBJQCQQUTA4kFgQOxBd0DuQUoBKAFXARoBXkEFAWBBKIEbwQVBEQE' +
'dAMEBMICrQMAAkEDOAHEAmwAOAKc/5wB0v73ABL+SwBc/Zr/t/zs/ib8Q/6r+6L9' +
'TPsM/Qb7hfza+hD8y/qx+9j6afsA+zv7Qvsn+5v7LvsK/FL7jfyP+yH95vvE/Vf8' +
'bf7Z/B3/b/3S/xX+hgDG/jUBf//aAToAcwLzAAADqQGAA1YC7QP2AkQEgwOEBPsD' +
'rgReBMAEpgS8BNQEnwTnBGsE3QQiBLgExQN4BFUDHgTWAq8DRwIrA6wBkwILAfEB' +
'ZQBEAbv/kQAT/9z/bv4p/9L9ff4//dz9ufxF/UT8wfzg+1H8j/v1+1X7svs0+4j7' +
'Kvt1+zj7fPtg+5z7n/vT+/f7IPxk/IH85vzz/Hj9dP0Y/gH+wv6V/nj/Mf80AM//' +
'7gBpAKUBAQFWApMB+wIZApMDlAIXBP8ChARYA9wEpAMbBdsDPQX7A0QFCgQtBQME' +
'9wToA6cEugM9BHwDuQMsAyADzgJ2AmUCugHtAfEAbAEkAOYAVP9bAIb+zv/C/UX/' +
'Cf2//l/8P/7J+8f9S/ta/ef6+fyg+qb8d/pj/G76MPyF+hH8u/oF/A/7C/x/+yb8' +
'CvxV/Kz8l/xh/en8Jf5N/fP+wf3H/0D+mgDJ/moBWf8yAvD/7QKKAJYDIwEoBLUB' +
'pQRDAgcFxgJLBToDcgWgA3gF8QNeBS8EKAVYBNQEaARmBGAE4QNABEUDBwSYArgD' +
'3wFUAx8B3gJYAFQCkf+8Ac/+GQET/mwAZf29/8r8EP9C/Gb+z/vE/XT7Lf0z+6b8' +
'Dvsy/AL70fsR+4j7OvtZ+337RfvW+0z7RPxu+8T8q/tU/QH88P1v/Jb+8vw//4f9' +
'6f8p/pQA1/47AYv/2QFDAGwC+QDxAqgBZgNOAsoD5wIaBG0DUwTeA3gEOASGBHsE' +
'fQSiBFwErgQnBJ4E3gN1BIMDMgQUA9YDmAJkAxEC5AJ+AVMC4wC0AUUADQGn/2IA' +
'CP+1/2/+Dv/e/XD+Vv3a/dj8Uf1s/Nr8Efx3/Mr7KPyY+/H7e/vR+3X7yPuG+9b7' +
'r/v6++77NPxA/IH8qPzh/CH9UP2r/cz9Qv5S/uX+4P6P/2//PAD//+oAjACUARMB' +
'OAKTAdICCgJfA3UC2gPQAkEEGgOTBFUDzQSAA+wElQPyBJoD3QSOA60EcANiBEMD' +
'/gMGA4QDvAL1AmYCUwIFAqMBmwHpACgBJwCwAGb/OACk/r//6f1H/zz91f6d/Gf+' +
'EPwB/pn7pv06+1T99foO/c761/zE+q/81vqV/Ab7jPxU+5P8vfur/D780/zV/A39' +
'ff1W/Tb+rv35/hL+wf+A/ooA9/5OAXT/DAL2/70CegBeA/0A6wN+AWAE+QG7BG0C' +
'+gTTAhwFLAMkBXgDDQWvA9kE0wOKBOMDHwTcA6ADwAMNA5ADaQJJA7kB8QIDAYcC' +
'SQAMAo//hQHZ/vEAK/5XAIr9uv/3/Bz/ePyC/g/88f2++2r9gvvu/GL7h/xd+zT8' +
'bfv0+5n7zvvb+8L7L/zL+5r87/sW/Sz8m/19/C3+5vzG/mH9Y//s/QIAhP6cACP/' +
'MQHH/8EBbwBEAhMBuAKuAR0DQAJ0A8QCuAM4A+gDlwMEBOADDAQRBAEEKQTjAyoE' +
'sgMSBHED4wMeA5wDvAJAA1EC1ALbAVkCWQHOAdMAPAFMAKgAwv8PADn/eP+1/uf+' +
'Nf5d/r794P1R/XL98PwT/Zz8x/xY/I78Jfxp/AX8Wfz3+138/Pt0/Bb8n/xE/Nv8' +
'hfwm/dj8gP08/eX9sf1T/jL+yP69/j//Uv+5/+3/MgCLAKcAKQEXAcQBfwFZAt4B' +
'4gIxAl8DegLLA7UCIwThAmUE/gKRBA4DpQQPA54EAQN9BOUCQgS8Au4DhwKCA0YC' +
'AQP7AW0CqAHKAU8BGQHvAGAAiwCj/yMA5v67/y7+Vv9//fT+3fyW/k38Pv7R++39' +
'bful/SP7Z/32+jX95/oR/fb6+fwi+/D8bPv1/NH7CP1Q/Cv95fxd/Yz9nP1C/un9' +
'A/9E/sv/qf6TABb/VQGI/w4C/v+8AnkAWwP1AOQDbAFVBN4BqgRHAuQEpQIBBfcC' +
'/gQ5A90EawOhBIwDSQSXA9kDjgNVA3MDvQJBAxkC/gJsAakCtwBBAv7/yAFL/0cB' +
'oP69AP/9LQBu/Zv/7fwJ/4D8ev4p/PT96ft4/cH7C/2y+678uvtk/Nn7MPwO/BP8' +
'V/wM/LT8Hvwh/Un8mP2I/Bn+3fyg/kX9K/+9/bn/Rf5EANb+yQBr/0kBBQC+AZ4A' +
'KAIzAYcCwwHXAkUCFwO5AkkDHANpA2oDeQOkA3gDyANnA9QDRwPLAxoDqgPfAnQD' +
'mAIpA0cCzQLtAWMCiwHsASIBawG1AOQARgBZANT/z/9h/0j/8v7K/on+Vv4k/uz9' +
'xv2R/XH9RP0n/Qn96Pzh/LX8yfyS/Mb8gPzU/H388fyK/B/9qPxa/df8pP0Z/fn9' +
'aP1V/sX9tv4z/hz/q/6C/y7/6f+6/1AASACwANgACwFmAV0B7wGlAXMC5gHsAh0C' +
'VwNGArMDZgL9A3sCLwSDAkkEgAJNBHUCOAReAgoEPgLEAxUCZgPjAfMCqQFsAmoB' +
'1QElATEB2wCBAIwAzP86ABj/6f9m/pb/vP1F/x399v6P/Kv+Fvxl/rL7I/5o++r9' +
'Ofu5/Sb7kP0y+3P9XPti/aL7XP0E/GX9fvx6/Q79nP2w/cr9Xv4D/hj/Sv7Y/5z+' +
'lwD2/lQBWv8GAsH/qwIsAEQDngDFAwsBKwRzAXwE2QGwBDcCxgSIAr8EzAKcBAID' +
'XQQnAwUEPAOWAzwDEwMpA4ACBQPfAc4CNgGGAogALQLZ/8YBLv9TAYv+1wDy/VQA' +
'Z/3N/+38Rf+J/MH+PPxE/gT8z/3k+2j93fsP/ez7x/wS/JP8S/xy/Jn8afz5/Hf8' +
'Y/2Y/Nn9zfxa/hj94f52/Wr/4/3x/1r+dQDd/vUAaP9sAfX/2gGCADwCCwGQAowB' +
'1gIEAgwDbAIxA8QCSAMLA1ADQANIA2EDLwNrAwkDYgPXAkUDmQIVA1EC1AL+AYEC' +
'owEhAkQBuAHeAEUBdwDOAA4AVgCk/9z/PP9m/9b+9v51/o7+Gv4w/sf93v1+/Zr9' +
'P/1k/Qv9P/3k/Cr9yfwl/b78MP3C/Ev91Px0/ff8qf0p/en9aP0v/rj9f/4W/tb+' +
'f/4v//L+iv9t/+X/7v89AHMAkgD4AOEAegEpAfkBbAFxAqcB3ALYATkD/gGHAxwC' +
'xAMxAuwDPAL9AzwC+QM1At0DIwKrAwgCYwPmAQUDvQGUAo0BFAJYAYMBGwHnANgA' +
'QwCRAJz/RwD2/v7/VP6z/7r9Z/8s/Rz/rfzT/kH8j/7q+1D+rPsX/oj75v1/+7/9' +
'kfug/b77i/0E/IL9Y/yG/dj8l/1i/bb9/P3g/aD+Ff5P/1j+AQCm/rIA/f5gAVz/' +
'BQLB/50CKwAjA5UAlQP+APMDZgE4BMkBYQQgAnAEbwJlBLICQQTnAgIECgOtAx0D' +
'QwMeA8UCCwM5AuYCogGwAgMBaAJiABECw/+tASf/PAGS/sIAB/5BAIn9vv8d/Tz/' +
'wvy9/nv8RP5M/Nj9Mfx2/Sz8Iv09/OH8Yvyy/Jr8mPzj/JT8Ov2k/J79yPwM/v/8' +
'g/5K/QD/p/1+/xH+/P+H/nUABP/qAIf/WAEOALwBkQAWAhEBZQKKAaYC+AHYAlkC' +
'+wKqAhAD6QIWAxcDDQMxA/gCOgPVAi8DpAINA2oC3AImApsC2gFMAoYB8gEsAY0B' +
'zAAgAWoAsQAHAD8AoP/N/z3/YP/e/vv+gv6b/iv+Rf7e/f39mf3B/V39k/0u/XT9' +
'Cv1k/fL8Yf3o/Gz97fyE/QL9qv0n/dz9WP0U/pf9VP7m/Zz+P/7m/qP+Nv8T/4n/' +
'iP/Z/wMAKACCAHYA/wC9AHsBAQHyAT4BXwJ0AcMCpAEZA8sBXgPpAZQDAQK2AxAC' +
'wwMUAroDEQKeAwcCagPzASID1wHIArYBWgKLAd0BWgFUASQBvwDmACQApACK/2EA' +
'7v4aAFf+0f/I/Yf/Q/08/9D89f5u/LH+Ifxy/uz7OP7P+wb+yvvc/d77vP0L/Kb9' +
'UPya/av8mv0c/aj9oP3F/TD+7P3L/h7+bf9c/hMApf65APn+WwFU//IBs/9+AhcA' +
'+wJ9AGQD4QC6A0QB+gOiASAE9wEtBEMCIgSDAv4DtQLDA9cCcgPoAg0D6QKXAtkC' +
'EgK4AoIBhQLtAEQCVADzAbv/lQEl/y4BlP69ABH+SgCb/dT/Mv1b/9z85v6b/Hj+' +
'bfwT/lP8uP1O/G39X/wy/YT8Bv28/Oz8Bf3m/Fz98vy+/RD9LP5B/aH+gv0a/9L9' +
'l/8x/hQAmf6OAAn/AQF+/2wB8//PAWsAJwLfAHICSwGwAq8B3wIHAv4CUgIQA48C' +
'DwO5AgED1ALmAt8CuwLWAoYCvgJGApcC+AFeAqUBGwJMAc8B6wB3AYcAGAEkALcA' +
'wf9TAFz/7f/8/ov/of4v/03+2f4A/ov+u/1H/oH9D/5U/eT9M/3E/R39sf0V/ar9' +
'Gf2v/S39wv1O/d79ff0F/rr9N/4B/m/+Uv6s/q/+8f4R/zf/ev+A/+v/yv9cABIA' +
'zgBYAD0BnACpAdwADgIYAWcCSwG2AnkB+QKfASsDvAFPA9QBYQPlAV4D6gFLA+kB' +
'JAPeAesCzQGiArUBRwKUAd4BbQFpAT8B6gAMAWUA1ADa/5YATv9TAMb+EABC/sz/' +
'x/2H/1n9Q//6/AL/q/zD/m78if5G/FX+M/wo/jb8Av5R/Of9gvzW/cf8zf0f/dD9' +
'if3g/QL+/f2I/iX+F/9Y/qv/k/5DANj+2QAm/2oBev/yAdL/bgIuAN0CjAA7A+kA' +
'hANBAbkDlQHZA+MB4gMnAtMDYAKuA4sCcwOnAiMDswLEArECVAKeAtYBegJOAUcC' +
'wAAFAi0AtAGb/1gBDP/0AIX+igAJ/hwAmP2r/zb9O//l/M/+pvxo/nv8Cv5l/Ln9' +
'ZPx2/Xf8Qv2d/B/92PwO/SP9D/19/SP94/1I/VL+e/3J/sD9R/8U/sb/cv5FANr+' +
'wQBJ/zcBvP+jAS8ABQKhAFsCDwGjAnYB3ALSAQQDIgIdA2UCJAOYAhsDuwIBA80C' +
'2gLPAqQCvwJfAp0CEQJuArsBMgJcAekB9gCVAY4AOQEkANgAvP9zAFb/DgD1/qr/' +
'mv5L/0b+8v78/aL+vP1b/ob9Hf5f/e79Rf3M/Tb9tP03/az9RP2x/V39wf2D/d39' +
'tv0E/vP9Nf45/m7+h/6s/t3+7v46/zX/mv9+//z/x/9fABAAvwBWAB8BmgB5AdgA' +
'ygEOARUCQAFYAm0BjQKQAbgCrgHUAsIB4QLNAeIC0gHSAs4BtALDAYgCsQFOApcB' +
'CAJ5AbYBVAFaASkB9QD6AIoAxQAZAI4AqP9UADb/FwDI/tv/X/6f//79Y/+m/Sn/' +
'Wv3w/hz9u/7t/Iv+z/xh/sT8Pv7K/CL+4vwO/gr9Af5E/QD+kf0K/uv9Hf5Q/jr+' +
'wf5i/jr/kv66/8z+PQAO/70AVv87AaX/sgH3/yACSwCDAqAA1gLyABoDQQFNA4wB' +
'awPPAXYDCQJtAzgCUANbAiADcgLcAnoChwJzAiMCXgKzATsCOQELArgAzgEyAIMB' +
'rP8uASn/0wCq/m8ANf4JAMz9of9v/Tv/If3Y/uX8e/68/Cf+pvzd/aT8oP22/HH9' +
'2/xS/RH9Q/1Z/UX9r/1Z/RH+ff1+/q/98/7w/W3/QP7p/5r+YQD7/tcAZP9HAdD/' +
'rQE8AAkCpwBXAgsBlwJpAcgCwAHnAgoC9gJHAvUCdwLiApQCwAKiAo8CoAJQAo0C' +
'BwJrArQBPAJYAf4B+QC1AZcAZAEyAAoBz/+sAG7/SwAS/+r/vf6M/3D+M/8t/uH+' +
'9f2Y/sj9V/6n/SL+k/36/Yv93v2P/dD9n/3P/br92v3g/fP9D/4W/kj+Q/6H/nn+' +
'zP61/hb/9/5l/zz/tP+D/wUAyv9UAA8AoABRAOoAkAAyAcwAcgEAAawBLQHeAVIB' +
'BwJuAScChAE+ApIBSQKXAUsClQFBAowBKgJ7AQwCZgHjAUsBsAErAXUBBwEyAeAA' +
'6AC1AJoAiQBFAFsA7v8sAJf//v9A/9D/6/6i/5v+d/9S/k//D/4p/9f9Bf+o/eX+' +
'hP3I/m39sf5k/Z3+aP2P/nv9iP6c/Yb+y/2K/gj+lv5Q/qj+ov7B/v/+4v5h/wf/' +
'yP8y/zMAY/+eAJv/BgHV/2oBEwDJAVMAHAKSAGQC0ACfAgsBygJCAegCdgHzAqIB' +
'7ALFAdUC4AGsAvEBcgL3ASwC8gHXAeEBdgHDAQwBmgGcAGcBKAAqAbT/5QBC/5kA' +
'1f5KAG7+9f8R/qD/v/1L/3r9+f5D/av+IP1m/g79Kf4M/fb9Hf3R/T79uP1w/az9' +
'sf2w/f/9w/1X/uT9t/4S/iD/Tv6N/5X++v/k/mYAOv/QAJb/MwH2/40BVQDcAbMA' +
'HwIMAVYCXgF+AqgBmALnAaICGgKdAj8CiQJWAmcCXQI4AlUC/gE+AroBGgJuAekB' +
'GgGrAcQAZgFsABcBEQC/ALn/ZgBk/wwAE/+w/8z+W/+M/gz/U/7C/iT+gv4C/k3+' +
'6f0i/tz9Bf7a/fX94v3x/fX9+v0S/hD+N/4x/mT+W/6Z/o7+1P7J/hL/Cf9S/0v/' +
'lv+R/93/1/8hABoAZABbAKUAmQDiAM4AGwH/AFABKQF8AUkBoAFgAb8BcQHXAXkB' +
'5QF4AeoBcAHoAWEB3AFMAcgBMwGrARUBhQHyAFkBzgAnAakA7gCCALAAWgBtADMA' +
'JgALAN//5/+Y/8X/UP+i/w3/hP/M/mj/kP5N/1z+Nv8u/iH/CP4N/+39/f7c/fH+' +
'1v3n/t394P7u/d7+C/7f/jP+5P5l/uz+o/76/uj+Df80/yT/hv9B/9z/Yv8zAIf/' +
'iwCw/+EA3v81ARAAggFCAMYBdQACAqoAMQLcAFQCDQFqAjkBcgJhAW0ChAFYAp4B' +
'NgKxAQYCugHJAbgBgwGtATIBlgHbAHUBfgBMAR4AFwG8/9oAXP+WAP/+TACp/v//' +
'W/6w/xb+YP/d/RL/sP3I/pP9hf6E/Un+g/0Y/pH98/2t/dv92P3P/Q/+0v1R/uL9' +
'nf4B/vD+Lf5I/2b+pv+q/gUA+f5iAE3/uwCm/xABAwBdAV8AoAG6ANsBEQEIAl8B' +
'KQKlAT4C4QFEAhACPgIxAioCQwIKAkUC4AE7AqwBIAJvAfgBLQHFAeMAhgGWAD0B' +
'RwDuAPj/mACr/0AAY//q/x7/lP/g/kT/qv76/n3+uP5Z/oD+Pf5S/iz+MP4l/hv+' +
'KP4T/jT+F/5I/if+Zf5C/or+aP62/pf+5v7K/hv/BP9U/0P/jv+D/8n/w/8FAAEA' +
'PwA8AHcAdACsAKcA3ADSAAkB+AAvARQBUAEqAWsBOQF+AT4BiwE9AZIBNwGPASoB' +
'hwEYAXcBAwFgAeoARQHQACMBtAD6AJYAzgB4AJ4AWwBqAD4ANQAkAP7/CgDF//H/' +
'j//a/1j/wv8k/6z/9f6Y/8r+hf+k/nP/hP5h/2z+T/9c/j//U/4y/1L+JP9a/hr/' +
'a/4Q/4T+Cv+m/gj/z/4I/wH/Dv83/xj/cv8m/7L/Ov/1/1T/OQBy/3wAlv+9AL3/' +
'/QDq/zgBGABsAUkAmQF7AL0BrQDaAd4A6wEMAfABNQHrAVoB2wF3Ab8BjAGaAZkB' +
'agGdATEBlQHxAIMBrQBpAWMAQwEVABMBx//bAHn/nAAu/1gA6P4QAKf+xf9v/nn/' +
'QP4w/xz+6/4C/qv+9P1x/vL9RP7+/SH+FP4I/jf+/P1k/v79m/4N/tv+K/4h/1X+' +
'a/+J/rj/xv4HAA3/VgBc/6MAr//rAAMALQFZAGcBqwCXAfgAvwE/AdsBfQHsAbEB' +
'8wHaAe0B9gHbAQMCvwEEApkB+AFqAd8BMwG5AfcAiQG3AFABcwAOASwAxgDn/3sA' +
'pP8vAGP/4/8o/5r/8v5W/8T+F/+d/uD+gP6z/m3+kf5h/nf+Xv5p/mX+Zv5z/mz+' +
'iv58/qj+lf7N/rb++P7e/ib/Cv9X/zr/iv9s/7//n//0/9L/KAACAFkALwCIAFkA' +
'sQB9ANcAnAD5ALYAFQHKACsB2QA7AeEARgHkAEoB4gBJAd0AQgHVADYByAAkAbkA' +
'DgGpAPQAmQDVAIgAtAB3AJAAZwBoAFgAPgBJABUAOwDr/y4Awf8iAJj/FgBv/wkA' +
'SP/8/yb/7v8G/9//6v7P/9P+vv/A/qz/sv6Y/6z+hP+s/m//sv5b/7/+SP/S/jb/' +
'6/4l/wv/F/8x/w7/XP8K/4r/C/+9/xH/8v8d/ykAMP9fAEn/lABp/8gAjv/5ALn/' +
'IwHn/0kBGQBpAU0AgQGCAJEBtwCXAegAlAEWAYgBPwFzAWABVgF5ATABigEDAZAB' +
'zwCNAZUAfgFYAGUBGQBDAdj/FgGY/+IAWv+mAB//YwDp/h0Auf7U/5H+jP9y/kb/' +
'W/4E/0/+yP5N/pL+Vf5n/mj+Rv6D/jH+qf4o/tX+K/4I/zv+Qf9X/n3/fv6+/7D+' +
'AADs/kAALv9/AHX/uQDB/+4ADAAeAVgASAGgAGgB4wCAASABjwFTAZQBfQGPAZwB' +
'gQGvAWwBtwFPAbMBKgGkAQABiQHQAGQBmwA3AWUABAEuAMsA9/+OAMD/TgCN/w8A' +
'Xf/S/zL/mf8N/2X/7f42/9T+D//C/u/+uP7Y/rX+y/64/sX+wv7H/tL+0v7n/uT+' +
'A//9/iP/Gv9E/zv/af9e/5H/hP+6/6n/4v/N/wsA8P8zABEAWAAtAHsARgCcAFsA' +
'uQBrANIAdgDnAH4A9wCDAAQBhAAMAYMADgF/AAwBegAFAXMA+gBtAOsAZgDYAGEA' +
'wQBcAKYAVwCJAFUAaABUAEYAUwAjAFIA/v9RANn/UQC1/04Akf9LAG//RQBO/zwA' +
'Mf8wABj/IwAB/xIA7/7//+P+6f/d/tD/2/61/+D+mv/r/n7/+/5j/xH/Sf8s/zL/' +
'TP8f/3D/D/+Z/wb/xf8C//L/Bf8hAA7/UAAe/30ANv+pAFX/0gB6//cApP8XAdP/' +
'MgEFAEUBOQBSAW0AVwGhAFQB0gBJAf8ANwEmAR4BRgH9AF4B1gBtAaoAcgF6AG0B' +
'RgBeAREARQHb/yQBpf/6AHH/xwBA/44AFP9RAO3+EADN/s//s/6O/6H+UP+Y/hf/' +
'l/7k/p/+uf6w/pf+x/59/ub+b/4M/2v+N/9z/mj/hv6b/6P+z//J/gUA+P46AC3/' +
'bgBo/58Ap//MAOf/8wAnABMBZgAuAaAAQAHUAEoBAgFNASgBSAFFATwBWQEpAWIB' +
'EAFiAfAAWQHMAEUBpAApAXkABwFMAN4AHgCxAPH/gQDE/04Amv8cAHT/7P9R/77/' +
'M/+U/xr/b/8G/1D/+f43//H+Jf/u/hn/8v4V//v+F/8J/yD/Hf8u/zT/QP9P/1b/' +
'bP9u/4v/iP+s/6P/z/++//D/2P8QAPD/MQAFAFAAGABsACgAhgA0AJ0APQCwAEIA' +
'wABGAM0ARwDWAEUA2wBEANsAQQDYAD0A0gA6AMgAOAC6ADcAqgA3AJcAOQCBADwA' +
'ZwBBAE0ARwAyAEwAFABSAPf/WQDa/14AvP9iAJ//YwCF/2IAbP9eAFb/VwBC/00A' +
'Mf8+ACP/LAAb/xYAGP/9/xf/4f8b/8X/Jf+n/zL/if9F/2z/XP9S/3b/Ov+V/yf/' +
'tv8Z/9n/D//+/w3/IwAR/0cAHP9qAC7/jQBH/60AZv/KAIv/4wC1//YA4v8EARIA' +
'DQFDABABdAANAaMAAwHOAPQA9ADeABUBwwAvAaQAQQGAAEsBWQBKAS4AQAEEAC4B' +
'2f8TAa//8ACH/8UAYP+VAD7/YAAg/ykABv/v//P+tv/m/n7/3/5K/+D+G//o/vT+' +
'9v7T/gv/u/4l/6z+RP+n/mj/q/6O/7n+uP/Q/uP/7/4PABX/OgBC/2IAc/+IAKf/' +
'qwDd/8kAEwDiAEUA9gB1AAMBoQAJAccACwHnAAYB/wD7AA8B6gAXAdQAFwG5ABAB' +
'nAACAXsA7QBXANEAMwCxAA4AjgDp/2kAxf9DAKT/HgCG//r/a//X/1P/uf9A/57/' +
'M/+J/yv/d/8m/2r/Jf9j/yv/Yf80/2T/Qf9q/1L/c/9n/3//ff+N/5X/nf+v/67/' +
'yv++/+X/zf///9v/GgDo/zMA8/9KAPv/XgABAHIABgCDAAkAkAAJAJwACgCkAAoA' +
'qAAJAKoACgCpAAsApQAMAJ4ADwCVABMAiQAaAHsAIgBsACwAWwA3AEgAQwAzAE8A' +
'HQBcAAgAZwDz/3EA3P94AMb/fgCy/4IAnv+AAIz/fAB8/3MAbv9mAGL/VgBZ/0EA' +
'U/8oAFD/DQBQ//D/Vf/R/1z/sv9m/5P/dP91/4X/Wv+Z/0P/r/8x/8j/I//j/xv/' +
'/v8Y/xoAHf82ACn/UQA6/2sAU/+EAHH/mwCU/60Auf+9AOP/yQAOANAAOQDSAGMA' +
'0QCMAMoAsQC+ANEArgDsAJkAAQGBAA4BZgAUAUcAEgEnAAkBBgD4AOP/4ADB/8EA' +
'ov+eAIP/dgBn/0oAT/8dADz/8P8t/8P/I/+Y/x7/cP8e/0z/JP8u/y//Fv8//wX/' +
'VP/8/m3/+v6J///+qf8K/8r/Hf/s/zX/DgBS/zAAdf9RAJr/bwDB/4oA6P+iAA8A' +
'tgA0AMUAVwDPAHYA1ACRANUApwDQALgAxgDCALgAxgClAMYAjwC/AHYAtABbAKUA' +
'PQCSACAAfAACAGQA5P9KAMj/MQCu/xcAlv/+/4H/6P9v/9P/Yv/C/1n/tP9T/6j/' +
'Uf+h/1P/nP9Z/5r/Y/+c/3D/oP9//6X/kP+t/6T/tf+5/77/zv/I/+T/0P/6/9n/' +
'DwDg/yQA5/83AO3/SADw/1YA8/9jAPX/bgD3/3YA9/98APf/gAD5/4AA+v9+APv/' +
'ewD//3UAAgBuAAYAZgANAFoAEwBOABwAQgAmADQAMAAlADsAFgBGAAcAUAD5/1kA' +
'6v9gANv/ZQDN/2kAwP9qALT/ZwCp/2EAn/9YAJf/TACR/z0AjP8rAIn/FwCI/wEA' +
'if/p/43/0f+S/7r/mv+i/6T/jf+x/3r/vv9q/87/Xv/e/1b/8P9T/wIAVP8WAFr/' +
'KQBl/zwAdP9OAIn/XwCh/24AvP97ANn/hQD4/40AGACRADgAkwBWAJIAcwCOAI0A' +
'hQCjAHkAtABrAMIAWgDKAEYAzAAxAMgAGgC/AAIAsADq/50A0v+FALr/agCl/0sA' +
'kf8qAID/CQBy/+j/Zv/H/17/qf9b/43/XP91/2H/YP9q/1D/dv9G/4X/QP+Y/0H/' +
'rf9H/8T/Uf/d/2D/9v90/xAAiv8pAKL/QQC9/1cA2f9rAPb/fAASAIoAKwCUAEMA' +
'mwBZAJ4AawCdAHoAmACFAI8AjACDAI4AdACNAGMAiQBPAIEAOQB1ACMAaAAMAFkA' +
'9f9JAOD/NwDL/yQAt/8TAKf/AgCZ//P/jf/k/4X/2P+A/83/fv/F/3//v/+E/7v/' +
'iv+5/5P/uf+f/7r/rf+8/7z/wP/M/8X/3f/K/+7/z//+/9T/DgDZ/x0A3/8qAOP/' +
'NgDo/0EA7P9KAO//UADx/1QA8/9XAPb/WAD5/1cA+/9UAP7/UAACAEsABwBEAAwA' +
'PAARADQAFwArAB4AIgAlABoALAARADMACAA6AP//QAD3/0YA8P9LAOj/TQDi/08A' +
'2/9OANX/SgDQ/0YAzP8+AMj/NQDG/ykAw/8cAMH/DQC///3/v//t/8D/3P/C/8r/' +
'xf+6/8n/q//O/57/1P+T/9r/i//i/4X/6/+C//T/hP/+/4j/CQCQ/xQAm/8fAKr/' +
'KgC6/zQAzf8/AOL/RwD4/08ADgBVACUAWQA7AFwATwBdAGEAWwBxAFYAfgBQAIcA' +
'SQCNAD4AjwAzAI0AJQCHABYAfgAGAHIA9v9hAOX/TgDW/zoAx/8kALn/DQCt//b/' +
'ov/f/5r/yv+U/7f/kf+l/5D/lv+T/4v/mP+C/6D/fv+r/33/uP9//8f/hf/X/47/' +
'6P+a//v/qP8NALj/HwDK/zAA3f9AAO//TgACAFoAFABjACUAagA0AG8AQQBwAEwA' +
'bgBVAGoAWwBiAF8AWQBfAE0AXgA/AFoALwBUAB8ATAAOAEMA/f84AO3/LQDd/yIA' +
'z/8WAML/CwC3/wAArv/2/6j/7f+k/+X/ov/e/6T/2f+n/9X/rf/T/7T/0f++/9H/' +
'yf/R/9T/0v/g/9T/7P/X//n/2v8FAN3/EQDg/xsA4/8lAOb/LADp/zIA6/83AO7/' +
'OgDw/zsA8v87APX/OQD4/zcA+v8zAP3/LwABACkABQAjAAgAHAAMABYAEQAQABUA' +
'CgAaAAUAHwAAACUA+/8qAPf/LQD0/zEA8f80AO//NgDt/zcA6/82AOr/NADq/zAA' +
'6f8rAOj/JQDn/x0A5v8UAOb/CwDl/wEA5f/1/+T/6v/k/9//5P/U/+T/yv/l/8L/' +
'5/+6/+n/tP/r/7D/7v+u//H/rv/1/7H/+v+2/wAAvP8GAMX/DADP/xIA2/8YAOj/' +
'HwD3/yQABQAqABMALwAiADMALgA1ADoANwBFADcATgA2AFQAMwBZADAAWwAqAFoA' +
'IwBXABwAUgASAEoACQBBAP7/NgDz/ykA6f8cAN//DgDV////zP/w/8T/4/++/9b/' +
'uv/L/7f/wf+3/7n/t/+z/7r/r/+//67/xv+v/8//sf/Z/7b/5f/A//P/0//+/+j/' +
'AgD3/wIA/v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAABAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA//8AAP//AAD//wAA//8AAAAA' +
'AAAAAAAA//8AAP//AAAAAAAAAAAAAAAAAAAAAAAAAAD//wAA//8AAAAAAAD//wAA' +
'//8BAAAAAQAAAAAA//8AAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAD//wAA' +
'AAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAQAAAAEA//8AAAAAAQAAAAEAAAABAP//' +
'AQD//wAAAAAAAAAAAAD//wAA//8AAP//AAD//wAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'//8AAAAAAAD//wAA//8AAP//AAAAAAAAAAAAAAAAAAD//wAA//8AAP//AAAAAAAA' +
'AAAAAAAAAAAAAAAA//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEA' +
'AAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAD//wAA//8AAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAD//wAAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAD//wEAAAABAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

// https://gainoheya.com/gas-qr-code-attendance/
</script>