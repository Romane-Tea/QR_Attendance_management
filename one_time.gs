////////　最初に実行する関数 ////////
function first_to_do(){
  var res = Browser.msgBox("確認", "初期設定、シートの作成を行います。\\n"+
    "その前に以下のことを確認してください。\\n"+
    "①学校の休日出勤日、振休日は入力しましたか？\\n"+
    "②名簿シートに名前、アドレスを入力しましたか？\\n"+
    "③管理者は一人以上にチェックしていますか。", Browser.Buttons.YES_NO);
  if(res == "yes"){
    var res2 = Browser.msgBox("祝日取得","国民の祝日を取得します。",Browser.Buttons.YES_NO);
      if (res2 =="yes"){
        holiday_get();      
      }else{
        Browser.msgBox("キャンセルしました。\\n 次に進みます。");
      }

    var res3 =Browser.msgBox("個人記録簿作成","名簿にある全員分の記録簿を作成します。",Browser.Buttons.YES_NO);
      if (res3 =="yes"){
          make_sheet();
      }else{
        Browser.msgBox("キャンセルしました。\\n 次に進みます。");
      }
    var res4 = Browser.msgBox("記録シート作成","記録シートを作成します。",Browser.Buttons.OK);
      if (res4 =="ok"){
        make_record_sheet();
      }
    var res5 =Browser.msgBox("シートの保護設定","設定シートや個人シートの保護設定を行います。",Browser.Buttons.YES_NO);
      if (res5 =="yes"){
        protect_sheet();
      }else{
        Browser.msgBox("キャンセルしました。\\n 次に進みます。");
      }
    var res6 =Browser.msgBox("メール送信","個人入力先をメールで一括送信します。",Browser.Buttons.YES_NO);
      if (res6 =="yes"){
        send_mail();
        Browser.msgBox("設定は以上です。");
      }else{
        Browser.msgBox("キャンセルしました。\\n設定は以上です。");
      }
    }
  else{
    Browser.msgBox("キャンセルしました。\\n再度実行する前に、初期設定等の確認をしてください。");
  }

}

///////////////// 個人記録シートを一括で作成 /////////////////
function make_sheet(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var main_sheet = ss.getSheetByName('在校時間記録簿');
  var meibo_sheet = ss.getSheetByName('名簿');

  //名簿一覧を取得
  var m_lastRow = meibo_sheet.getLastRow();
  const meibo = meibo_sheet.getRange(2,2,m_lastRow,1).getValues();
  // [ [ '杉山 孝一' ],  [ '北條 文子' ],  [ '安部 忠衛' ],]と二次元配列
  const gako = meibo_sheet.getRange("K1").getValue();

  //シートを名簿分複製する
  for (var i=0; i< meibo.length; i++){
    const s_name =ss.getSheetByName(meibo[i][0]); //シートがすでにあるか確認用
    if (meibo[i][0] !='' && s_name == null){
      newSheet = main_sheet.copyTo(ss);
      newSheet.setName(meibo[i][0]);
      newSheet.getRange("I4").setValue(meibo[i]); //シート名を名前にする
      newSheet.getRange("G3").setValue(gako); //学校名を入力する
      const sheetId = newSheet.getSheetId();
      meibo_sheet.getRange(2+i,7).setValue(sheetId);  //シートIDを名簿に入力する
      console.log(meibo[i][0]+" シート作成");
    }
  }
}

///////////シートの保護設定を一括でする/////////////////
function protect_sheet(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var meibo_sheet = ss.getSheetByName('名簿');

  //名簿一覧を取得
  var m_lastRow = meibo_sheet.getLastRow();
  const meibo = meibo_sheet.getRange(2,1,m_lastRow-1,3).getValues();

  const ok_list = [];
  for (i=0; i<meibo.length; i++){
    if (meibo[i][0]== true && meibo[i][2] !=""){
      ok_list.push(meibo[i][2]);
    }
  }
  const remove_editers = [];
  for (i=0; i<meibo.length; i++){
    if (ok_list.includes(meibo[i][2]) || meibo[i][2]==""){}else{
      remove_editers.push(meibo[i][2]);
    }
  }
  console.log("ok_list=",String(ok_list).split(","),"remove_editers=",String(remove_editers).split(","));
  // シートを主要シート＋名簿分保護設定をする
  for (var i=0; i< meibo.length; i++){
    const s_name = ss.getSheetByName(meibo[i][1]); //シートがすでにあるか確認用
    if (meibo[i][1] !='' && s_name != null){
      console.log(meibo[i][1],"保護設定しました");
      let protection = s_name.protect();                    //シート全体を保護
      let unprotection = protection.getUnprotectedRanges(); //保護を外す範囲を設定
      unprotection.push(s_name.getRange('E4'));
      unprotection.push(s_name.getRange('D6:D36'));
      unprotection.push(s_name.getRange('F6:F36'));
      unprotection.push(s_name.getRange('H6:I36'));
      protection.removeEditors(remove_editers);             //許可ユーザー以外を全体の編集者から削除
      protection.addEditors(ok_list);                       //許可ユーザーを追加
      protection.setUnprotectedRanges(unprotection);        //指定範囲の保護を外す
    }
  }
  const add_list = ["ScanQRData", "履歴", "入力", "名簿", "記録", "在校時間記録簿"];
  for (var i = 0; i< add_list.length; i++){
    const s_name = ss.getSheetByName(add_list[i]); //シートがすでにあるか確認用
    if (s_name != null){
      console.log(add_list[i],"保護設定しました");
      s_name.protect();
    }
  }
}

///////////////// 作成した個人シートリンクをメールで一斉送信 ///////////////////
function send_mail(){
  //デプロイアドレスを取得
  const deploy = ScriptApp.getService().getUrl();
  const ss = SpreadsheetApp.getActiveSpreadsheet(); 
  const sheet = ss.getSheetByName('名簿'); 
  const lastRow = sheet.getLastRow(); 

  const subject = '在校時間記録簿の入力先を送ります。'; 

  for(let i = 2; i <= lastRow; i++){
    const i_name = sheet.getRange(i,2).getValue();   //名前を取得
    const mail_address = sheet.getRange(i,3).getValue();   //メールアドレスを取得
    const i_ID = sheet.getRange(i,7).getValue();   //IDを取得
    const re = /\S+@\S+\.\S+/;
    
    //名前が空、またはアドレスが空、またはアドレス形式じゃない
    if (i_name=="" || mail_address =="" || re.test(email)){}else{
      link = ss.getUrl()+"#gid="+i_ID;    //在校時間記録簿の個人アドレス
      //本文
      const body = i_name + "さんの在校時間記録簿のアドレスは以下の通りです。<br>こちらを今後使ってください。";
      const mail_options = {
        htmlBody: body + "<br>" + link
      };
      console.log(i_name, mail_address, link, mail_options);

      GmailApp.sendEmail(mail_address, subject, body, mail_options);
    }
  }
}

//////////////記録シートの作成をする///////////////////
function make_record_sheet(){
  const ss = SpreadsheetApp.getActiveSpreadsheet(); 
  const meibo_sheet = ss.getSheetByName('名簿');
  if (!ss.getSheetByName('記録')) {
    ss.insertSheet('記録');
  }
  const record_sheet = ss.getSheetByName('記録');
  const last_row = meibo_sheet.getLastRow();    //名簿シートの最終行
  const r_last_row = 389; //記録シートの最終行
  const meibo_data = meibo_sheet.getRange(2,2,last_row-1,1).getValues();  //氏名一覧を取得
  const sheetId= record_sheet.getSheetId();     //記録シートのIDを取得
  let set_day = new Date(meibo_sheet.getRange(9,10).getValue());
  console.log(set_day);

  record_sheet.getRange(1,1).setValue("番号");
  record_sheet.getRange(2,1).setValue("名前");
  record_sheet.getRange(3,1).setFormula('=HYPERLINK("#gid='+sheetId+'"&"&range=A"& MATCH(TODAY(),A:A)&"","本日へ移動")');

  //日付をスタート日から389日分入力
  for (let i=0; i<r_last_row-4; i++){
    record_sheet.getRange(i+4,1).setValue(set_day);
    set_day.setDate(set_day.getDate()+1);
  }
  //名簿分、記録欄を作成
  for (let i = 0; i<meibo_data.length; i++){
    if (meibo_data[i][0] !=""){
      let range = record_sheet.getRange(1,i*4+3,3,4);
      let data = [[i+1,"","",""],[meibo_data[i][0],"","",""],["出勤","退勤","備考1","備考2"]]
      range.setValues(data);
    }
  }
  //時間入力セルの書式を設定する
  for (let j=0; j<meibo_data.length; j++){
    let set_range = record_sheet.getRange(4,j*4+3,r_last_row,2);
    set_range.setNumberFormat('H:mm:ss');
  } 
  /////////出勤日か確認して、出勤日なら1を入力する//////////
  const nyuryoku_sheet = ss.getSheetByName('入力');
  const n_last_row = nyuryoku_sheet.getLastRow();
  const n_last_col = nyuryoku_sheet.getLastColumn();
  const nyuryoku_data = nyuryoku_sheet.getRange(1,1,n_last_row,n_last_col).getValues();
  //国民の祝日・休日,振休等を取得
  const syukuzitu = [];
  for (var i=4; i<nyuryoku_data.length; i++){
    if (nyuryoku_data[i][0] !=""){
    syukuzitu.push(nyuryoku_data[i][0]);
    }
    if (nyuryoku_data[i][6] !=""){
      syukuzitu.push(nyuryoku_data[i][6]);
    }
  }
  //土日の出勤日を取得
  const syukkin = [];
  for (var i=4; i<nyuryoku_data.length; i++){
    if (nyuryoku_data[i][4] !=""){
    syukkin.push(nyuryoku_data[i][4]);
    }
  }

  const recode_day_data = record_sheet.getRange(4,1,r_last_row,1).getValues();
  for (var i=0;i<r_last_row-4; i++){
    const r_day = new Date(recode_day_data[i][0]);
    //記録シートの日付と比較、国民の祝日等なら空白
    if (syukuzitu.some(date => date.getTime() === r_day.getTime()) ){
      record_sheet.getRange(i+4,2).setValue("");
    //出勤日なら1
    } else if (syukkin.some(date => date.getTime() === r_day.getTime()) ){
      record_sheet.getRange(i+4,2).setValue("1");
    //土日なら空白
    } else if (r_day.getDay()==0 || r_day.getDay()==6){
      record_sheet.getRange(i+4,2).setValue("");
    //それ以外は1として出勤日
    }else{record_sheet.getRange(i+4,2).setValue("1");}
  }
}

///////////////月の最終勤務日を取得/////////////////////////
function getLastDates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); 
  const record_sheet = ss.getSheetByName('記録');
  var data = record_sheet.getDataRange().getValues();
  
  var lastDates = {};
  
  // データをループして月ごとに最後の出勤日を取得
  for (var i = 0; i < data.length; i++) {
    var date = data[i][0]; // A列の日付
    var attendance = data[i][1]; // B列の出勤日
    
    if (date instanceof Date && attendance === 1) {
      var year = date.getFullYear();
      var month = date.getMonth() + 1; // 月は0から始まるため+1する
      
      // 同じ年月の場合、最後の出勤日を更新
      lastDates[year + "-" + month] = date;
    }
  }
  let last_M_days = Object.values(lastDates); //日付データを配列にする
  // console.log(last_M_days);
  return last_M_days;
}

////////////出勤日が空白でないか確認/////////////
function check_day(col,month){
  const ss = SpreadsheetApp.getActiveSpreadsheet(); 
  const record_sheet = ss.getSheetByName('記録');
  const data = record_sheet.getDataRange().getValues();
  const today = new Date();
  const toYear = today.getFullYear();
  const toMonth = today.getMonth();
  const start_day = new Date(toYear,toMonth,1);
  const end_day_Date = new Date(toYear,toMonth+1,0).getDate() - start_day.getDate() +1;
  for (var start_day_row=4; start_day_row<data.length-4; start_day_row++){
    if (data[start_day_row][0].getTime() ==  start_day.getTime()){;
      break;
      }
  }
  let no_days = [];
  for (i=0;i<end_day_Date; i++){
    if(data[start_day_row+i][1]==1 && (data[start_day_row+i][col]=="" ||data[start_day_row+i][col+1]=="" )){
      no_days.push((i+1)+"日");
    }
  }
  return no_days;
}

////////////////　月の最終日を取得し、個人の未入力を取得し、月末にメールを送る ///////////////
function check_send_mail(){
  const ss = SpreadsheetApp.getActiveSpreadsheet(); 
  let today = new Date();
  today.setHours(0, 0, 0, 0);       //当日を0時0分にセット
  let last_M_days = getLastDates(); //各月の最終出勤日を取得
  let month = 20;                   //最終出勤日の月を入れる変数
  for (var i=0;i<last_M_days.length; i++){
    if (today.getTime() == last_M_days[i].getTime()){
      month = today.getMonth();
    }
  }
  //月の最終出勤日だったら
  if (month<12){
      const meibo_sheet = ss.getSheetByName('名簿');
      const last_row = meibo_sheet.getLastRow();    //名簿シートの最終行
      const meibo_data = meibo_sheet.getRange(2,2,last_row-1,6).getValues();  //氏名一覧を取得
      
      for (let m_col=0;meibo_data.length; m_col++){
        if (meibo_data[m_col][0]!="" && meibo_data[m_col][1]!="" && ss.getSheetByName(meibo_data[m_col][0])){
          let col = m_col*4+3;
          let no_input_day = check_day(col,month);
          let sheetId = meibo_data[m_col][5];
          console.log(meibo_data[m_col][0], meibo_data[m_col][1], sheetId, String(no_input_day).split(','));
          if (no_input_day.length != 0){
            try{
              send_mail_check_day(meibo_data[m_col][0], meibo_data[m_col][1], sheetId, String(no_input_day).split(','));
            } catch(e) {
              console.log(e.message);
            }
          }
        }
      }
  }
}


///////////////// 未記入日をメールで一斉送信 ///////////////////
function send_mail_check_day(name, mail_address, sheetId, no_input_day){
  const ss = SpreadsheetApp.getActiveSpreadsheet(); 
  const subject = '在校時間記録簿の確認をお願いします。'; 

  link = ss.getUrl()+"#gid="+sheetId;    //在校時間記録簿の個人アドレス
  //本文
  const body = name + "さんの在校時間記録簿で、次の日が未入力です。<br>"+no_input_day;
  const mail_options = {
    htmlBody: body + "<br>時間の記入をお願いします。<br>" + link
  };
  console.log(name, mail_address, link, mail_options);
  if (no_input_day.length != 0){
    GmailApp.sendEmail(mail_address, subject, body, mail_options);
  }
}



// 祝日一覧取得関数　https://qiita.com/ik-fib/items/6c35640954c2b04a9287
// マイカレンダー（ https://calendar.google.com/ ）に「日本の祝日」カレンダーが登録されていないとエラーになります。
function holiday_get() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); 
  const nyuryoku_sheet = ss.getSheetByName('入力');
  // 今年の1/1から
  var startDate = new Date();
  startDate.setMonth(0, 1);
  startDate.setHours(0, 0, 0, 0);

  // 来年の12/31まで
  var endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1, 11, 31);
  endDate.setHours(0, 0, 0, 0);  

  var holidays = getHoliday(startDate, endDate);

  var lastRow = nyuryoku_sheet.getLastRow();
  var startRow = 5;

  nyuryoku_sheet.getRange(startRow, 1, holidays.length, holidays[0].length).setValues(holidays);
}

/**
 * startDate〜endDateまでの祝日をgoogleカレンダーの「日本の祝日」から取得
 * [日付,祝日名]の多次元配列にした上で返す
 */
function getHoliday(startDate, endDate) {
  var cal = CalendarApp.getCalendarById("ja.japanese#holiday@group.v.calendar.google.com");

  var holidays = cal.getEvents(startDate, endDate);
  console.log(startDate, endDate);
  var values = [];

  for(var i = 0; i < holidays.length; i++) {
    values[i] = [holidays[i].getStartTime(), holidays[i].getTitle()];
  }
  return values;
}

// QRコードシートに、一括で氏名、アドレスを貼り付け
function make_QR_sheet_paste() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  const meibo_sheet = ss.getSheetByName('名簿');
  const last_row = meibo_sheet.getLastRow();     //名簿シートの最終行取得
  const meibo = meibo_sheet.getRange(1, 1, last_row, 3).getValues(); //名簿一覧を取得
  const qr_sheet = ss.getSheetByName('QRコード');
  for ( var i=0; i<Math.ceil(meibo.length/8); i++){
    if (meibo[i*8][2] ==""){}else{
      const s_range = meibo_sheet.getRange(i*8+2,2,8,2);
      s_range.copyTo(qr_sheet.getRange(i*4+2,1,2,8),SpreadsheetApp.CopyPasteType.PASTE_NORMAL, true);
      qr_sheet.getRange(i*4+2,1,1,8).setFontSize(11)
        .setHorizontalAlignment('left');
      qr_sheet.getRange(i*4+3,1,1,8).setFontSize(7);
    }
  }
}
