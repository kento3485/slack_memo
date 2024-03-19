function createFirstRow(){
  /* 
   * 列のインデックスをつけるための関数。以下の手順でインデックスをつけれる。
   * 
   * 1. SHEET_NAMEに、一行目の列インデックスを追加したいシート名を入力する。
   * 
   * 例）シート名が「テスト」の場合　
   *    const SHEET_NAME = "テスト"
   * 
   * 2. 保存(Ctrl+S)する。
   * 3. 上のメニューの「(関数名)▼」ボタンから「createFirstRow」を選択して「▷実行」をする。
   * 4. シートに列のインデックスができていることを確認する。
   */
  const SHEET_NAME = "memo"

  setColumn(SHEET_NAME);
}

function setColumn(sheetName){
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.insertRowBefore(1)
  const array = ["date", "time", "ts", "username", "display_name", "text"];
  for (let i = 0; i < array.length; ++i)
  sheet.getRange(1,i+1).setValue(array[i]);
  sheet.setFrozenRows(1);
}

// Logを'debug'のシートに出力する。
function postLog(obj){
  const debugsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('debug');
  debugsheet.appendRow([obj]);
  return ;
}

// userのIDからuserの情報を取得する。
function retrieveProfile(user){
  /* profileを取得する。以下が参考URL
   * 
   * https://api.slack.com/methods/users.info
   * 
   */
  
  // postLog("retrieveProfile was called.")

  //profile取得のためのtokenの取得
  const SLACK_BOT_USER_TOKEN = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_USER_TOKEN') 
  const SLACK_GET_USER_INFO_URL = 'https://slack.com/api/users.info'
  
  const options = {
    method: 'get',
    headers: {
      'Authorization' : 'Bearer ' + SLACK_BOT_USER_TOKEN,
    },
    contentType : "application/x-www-form-urlencoded",
    payload : {
      user : user
    }
  }

  //APIにリクエストし、ユーザ情報を取得する
  const responseDataPOST = UrlFetchApp.fetch(SLACK_GET_USER_INFO_URL,options).getContentText();
  // postLog(responseDataPOST)

  return JSON.parse(responseDataPOST).user;
}

// channelのIDからchannelの情報を取得する。
function retrieveChannelInfo(channel){
  /* channel infoを取得する。以下が参考URL
   * 
   * https://api.slack.com/methods/conversations.info
   * 
   */
  
  // postLog("retrieveProfile was called.")

  //channel info取得のためのtokenの取得
  const SLACK_BOT_USER_TOKEN = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_USER_TOKEN') 
  const SLACK_GET_CHANNEL_INFO_URL = 'https://slack.com/api/conversations.info'
  
  const options = {
    method: 'get',
    headers: {
      'Authorization' : 'Bearer ' + SLACK_BOT_USER_TOKEN,
    },
    contentType : "application/x-www-form-urlencoded",
    payload : {
      channel : channel
    }
  }

  //APIにリクエストし、channel情報を取得する
  const responseDataPOST = UrlFetchApp.fetch(SLACK_GET_CHANNEL_INFO_URL,options).getContentText();
  // postLog(responseDataPOST)
  // console.log(responseDataPOST)

  return JSON.parse(responseDataPOST).channel;
}




function PostMessage(payload={"text": "Hello, world."}){
  const SLACK_API_INCOMING_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('SLACK_API_INCOMING_WEBHOOK_URL');
  
  const options = {
   method: 'post',
   muteHttpExceptions : true, // なくても動く？
   contentType: 'application/json',
   payload: JSON.stringify(payload)
  }

  //APIにリクエストし、メッセージを送る。
  const responseDataPOST = UrlFetchApp.fetch(SLACK_API_INCOMING_WEBHOOK_URL,options).getContentText();
  // postLog(responseDatePOST);

  return responseDataPOST
}

function verifiUser(user){
  if (user != PropertiesService.getScriptProperties().getProperty('SLACK_USER_ID')) {
    // postLog("Invalid slack user (" + user + ")")
    return false;
  }
  // postLog("User is valid. user:" + user);
  return true
}

function doPost(e) {
  try 
  {
  // postLog("doPost was called.")
  const SLACK_VERIFICATION_TOKEN = PropertiesService.getScriptProperties().getProperty('SLACK_VERIFICATION_TOKEN') 

  // 受け取ったデータをdataに保存
  const data = JSON.parse(e.postData.getDataAsString());
  console.log(data)

  
  // tokenの検証
  const verification_token = data.token
  console.log(verification_token)
  if (verification_token !== SLACK_VERIFICATION_TOKEN) {
    const error_msg = "Invalid verification token. (" + verification_token + ")";
    // postLog(error_msg);
    console.error(error_msg)
    return ack('invalid_access_token');
  }
  // postLog("Token is valid.")


  // challenge response
  if (data.type === "url_verification") {
      console.log("Challenge response.")
      return ContentService.createTextOutput(data.challenge);
  }

  // api_app_idの検証
  const apiAppId = data.api_app_id;
  console.log(apiAppId)
  if (apiAppId !== PropertiesService.getScriptProperties().getProperty('SLACK_APP_ID')) {
    console.error("Invalid slack api_app_id (" + apiAppId + ")")
    return ack( 'invalid_api_app_id');
  }
  // postLog("api_app_id is valid.")

  console.log(data.event)

  const user = data.event.user;

  //userの検証
  // if (verifiUser(user)) return ack( 'invalid_user');


  const profile = retrieveProfile(user);
  // postLog(profile);
  const username = profile.real_name;
  const display_name = profile.profile.display_name;


  // postLog("Profile has been fetched. username:" + username);

  const ts = data.event.ts;
  console.log(ts);
      
  const channel = data.event.channel;
  console.log(channel);

  const channelInfo = retrieveChannelInfo(channel)

  const channelname = channelInfo.name

  // postLog(channel)
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(channelname);//シート名

  // Googleスプレッドシートにデータを追加する処理
  // postLog("data.event.type is " + data.event.type)
    if (data.event.type == "message"){
      const datetime = new Date();
      const date = (datetime.getFullYear() + '/' + ('0' + (datetime.getMonth() + 1)).slice(-2) + '/' + ('0' + datetime.getDate()).slice(-2))
      const time = (('0' + datetime.getHours()).slice(-2) + ':' + ('0' + datetime.getMinutes()).slice(-2));
      const text = data.event.text;
      // postLog(text);

      array = [date, time, ts, username, display_name, text];
      sheet.appendRow(array);
    }
  return ack("")
  }
  catch(error)
  {
  return ack( 'backend_error');
  }

}
