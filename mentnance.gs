function copyRange_auto() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const main_sheet = ss.getSheetByName('在校時間記録簿');
  const meibo_sheet = ss.getSheetByName('名簿');

  //名簿一覧を取得
  let m_lastRow = meibo_sheet.getLastRow();
  const meibo = meibo_sheet.getRange(2,2,m_lastRow,1).getValues();

  const copyRange = main_sheet.getRange('H6:V36');


  //シートを名簿分実行する
  for (let i=0; i< meibo.length; i++){
    const s_name =ss.getSheetByName(meibo[i][0]); //シートがすでにあるか確認用
    if (meibo[i][0] !='' && s_name != null){
      console.log(meibo[i][0]+"　実行");
      const pasteRange = s_name.getRange('H6:V36');
      copyRange.copyTo(pasteRange, SpreadsheetApp.CopyPasteType.PASTE_NORMAL, false);
    }
  }
};

function hideColumns_auto() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const meibo_sheet = ss.getSheetByName('名簿');
  let last_row = meibo_sheet.getLastRow();     //名簿シートの最終行取得
  let meibo = meibo_sheet.getRange(2, 2, last_row, 1).getValues(); //名簿一覧を取得
  
  for ( let i=0; i<meibo.length; i++){
    if (meibo[i][0] ==""){}else{
      //各個人シートで操作
      let temp_sheet = ss.getSheetByName(meibo[i][0]);
      if (temp_sheet !=null){

      temp_sheet.hideColumns(17, 6);
      }
    }
  }
}