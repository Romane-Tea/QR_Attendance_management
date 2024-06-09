const SHEET_NAME = 'ScanQRData';

const doGet = () => {
  return HtmlService.createTemplateFromFile("index").evaluate()
    .setTitle("出勤管理アプリ")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
};

function getScriptUrl() {
  var url = ScriptApp.getService().getUrl();
  return url;
}

////////////// スキャン成功時に記録する関数 /////////////////
function onScan(decodedText,text2, write_row,index) {
  // decodedText = 'tatsuya-gqi5232jm3@gs.myswan.ed.jp', text2 = '退勤', write_row = 75,index = 28;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let now_time = new Date();
  ss.getSheetByName(SHEET_NAME).appendRow([now_time, decodedText,text2]);
  ss.getSheetByName("履歴").appendRow([now_time, decodedText,text2]);

  // 記録シートにも記録する
  let record_sheet = ss.getSheetByName('記録');
  // 書き込む列を特定
  let write_col = 2;
  if (text2 =="退勤"){write_col = 3;}
  write_col = write_col + index*4-3;
  console.log("write_row=",write_row,"write_col=",write_col);
  record_sheet.getRange(write_row,write_col).setValue(now_time);
  console.log(now_time,decodedText,text2, index);
}

////////// スプレッドシートの指定行にデータを書き込む /////////////
function onScan_rewrite(row, decodedText, now_name, write_row,index){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let now_time = new Date();
  ss.getSheetByName("履歴").appendRow([now_time, decodedText,"退勤上書き"]);

  //ファイルをIDで指定、シートをシート名で指定
  const sheet = ss.getSheetByName(SHEET_NAME);

  //データを書き;込む範囲を指定して、書き込みます
  console.log(now_time,row, decodedText, now_name, index);
  sheet.getRange(row + 1, 1).setValue(now_time);

  // 記録シートにも記録する
  let record_sheet = ss.getSheetByName('記録');
  // 書き込む列を特定
  let write_col = 3 + index*4-3;

  record_sheet.getRange(write_row,write_col).setValue(now_time);
}

/////////////// スプレッドシートのデータをシート名で表示名のまま読み込む ///////////////
function GetSpreadsheet(sheet_name,row,col){
  //操作するシート名を指定して開く
  // row:指定した最終行　col:指定した最終列
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet_name);

  //全データを取得するので、最終列と最終行を取得する
  if (!row){ row = sheet.getLastRow();}  //最終行取得
  if (!col){ col = sheet.getLastColumn();}  //最終列取得

  if (row < 1) {
    return [];
  }else{
    return sheet.getRange(1, 1, row, col).getDisplayValues();  //表示のまま読み込み
  }
}

//GAS用関数　スプレッドシートのデータをシート名で読み込む 
function GetSpreadsheet2(sheet_name){
  //操作するシート名を指定して開く
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet_name);

  //全データを取得するので、最終列と最終行を取得する
  const last_col = sheet.getLastColumn();  //最終列取得
  const last_row = sheet.getLastRow();     //最終行取得
  if (last_row < 1) {
    return [];
  }else{
    return sheet.getRange(1, 1, last_row, last_col).getValues();   //日付データもそのまま読み込み
  }
}

///////////////// 個人シートの時間と備考を記録、数式の復活 ////////////////
function auto_dairy_record(){
  record_kozin();
  record_time_clear();
}

function record_kozin(){
  SpreadsheetApp.flush();  // 変更内容を即反映
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const meibo_sheet = ss.getSheetByName('名簿');
  const record_sheet = ss.getSheetByName('記録');
  const record_sheet_data = GetSpreadsheet2('記録');

  let last_row = meibo_sheet.getLastRow();     //名簿シートの最終行取得
  let meibo = meibo_sheet.getRange(2, 2, last_row, 1).getValues(); //名簿一覧を取得

  for ( var i=0; i<meibo.length; i++){
    if (meibo[i][0] ==""){}else{
      //各個人シートで操作
      let temp_sheet = ss.getSheetByName(meibo[i][0]);
      if (temp_sheet !=null){
        console.log(meibo[i][0]+"実行");
        let start_day = new Date(temp_sheet.getRange(6,2).getValue());  //1日の日付を取得
        let end_day = new Date(start_day.getFullYear(), start_day.getMonth()+1, 0); //最終日を取得
        let end_day_Date = end_day.getDate();   //最終日の日付を数値で取得

        for (let s_row=3; s_row<record_sheet_data.length; s_row++){
          if (record_sheet_data[s_row][0].getTime() == start_day.getTime()){
            break
          }
        }
        s_row = s_row+1;    //開始行
        let c_range1 = temp_sheet.getRange(6,4,end_day_Date,1);    //出勤時間コピー元
        let c_range2 = temp_sheet.getRange(6,6,end_day_Date,1);    //退勤時間コピー元
        let c_range3 = temp_sheet.getRange(6,8,end_day_Date,2);    //備考コピー元

        let p_range1 = record_sheet.getRange(s_row,i*4+3,end_day_Date,1);//出勤時間貼付け先
        let p_range2 = record_sheet.getRange(s_row,i*4+4,end_day_Date,1);//退勤時間貼付け先
        let p_range3 = record_sheet.getRange(s_row,i*4+5,end_day_Date,2);//備考貼付け先
        // 記録シートにデータを保存する
        c_range1.copyTo(p_range1,{contentsOnly:true});
        c_range2.copyTo(p_range2,{contentsOnly:true});
        c_range3.copyTo(p_range3,{contentsOnly:true});
        //個人シートの関数を復元する
        let c_cell = temp_sheet.getRange('T6:Y36');
        let p_cell = temp_sheet.getRange('D6:I36');
        c_cell.copyTo(p_cell, SpreadsheetApp.CopyPasteType.PASTE_NORMAL);
      }
    }
  }
}

///////////////// 集計月を再設定 ////////////////////
function syukei_tuki(){
  record_kozin();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const meibo_sheet = ss.getSheetByName('名簿');

  let last_row = meibo_sheet.getLastRow();     //名簿シートの最終行取得
  let meibo = meibo_sheet.getRange(2, 2, last_row, 1).getValues(); //名簿一覧を取得
  let set_month = meibo_sheet.getRange("N2").getValue();

  for ( let i=0; i<meibo.length; i++){
    if (meibo[i][0] !=""){
      let temp_sheet = ss.getSheetByName(meibo[i][0]);
      if (temp_sheet !=null){
        temp_sheet.getRange('E4').setValue(set_month);
      }
    }else{}
  }
}

///////////////// その日の勤務時間を記録シートに保存,読み込んだデータを削除する ///////////////////
function record_time_clear(){
  const ss = SpreadsheetApp.getActiveSpreadsheet(); 
  const ScanQRData_sheet = ss.getSheetByName('ScanQRData');
  // ScanQRData_sheetを空にする
  ScanQRData_sheet.clear();
}

function WAREKI(year) {
  let m = new Date(year, 4, 1); // e.g. "2022-01-01"
  let dt = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {era: 'short'});
  [{ value: era }, { value: year }] = dt.formatToParts(m); // e.g. {type: 'era', value: '令和'},{type: 'year', value: '4'},{type: 'literal', value: '年'}
  if (year ==1){year = "元";}
  let str = era +"　"+ year + "　年";
  return str;
}