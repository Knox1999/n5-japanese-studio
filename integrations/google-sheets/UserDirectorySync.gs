const SHEET_NAME='Users';

function getConfig_(){
  const props=PropertiesService.getScriptProperties();
  const url=(props.getProperty('SUPABASE_URL')||'').replace(/\/$/,'');
  const key=props.getProperty('SUPABASE_SERVICE_ROLE_KEY')||'';
  if(!url||!key)throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Apps Script Properties. Never put the service-role key in sheet cells.');
  return {url,key};
}

function fetchUsers_(){
  const {url,key}=getConfig_();
  const response=UrlFetchApp.fetch(`${url}/rest/v1/admin_user_directory?select=*&order=joined_at.desc`,{
    method:'get',
    headers:{apikey:key,Authorization:`Bearer ${key}`},
    muteHttpExceptions:true,
  });
  if(response.getResponseCode()>=300)throw new Error(`Supabase sync failed: ${response.getResponseCode()} ${response.getContentText()}`);
  return JSON.parse(response.getContentText());
}

function syncUserDirectory(){
  const rows=fetchUsers_();
  const book=SpreadsheetApp.getActiveSpreadsheet();
  const sheet=book.getSheetByName(SHEET_NAME)||book.insertSheet(SHEET_NAME);
  const headers=['Name','Email','User ID','Joined Date','Last Active','Status','Role','Current Lesson','Progress Updated'];
  const values=rows.map(row=>[
    row.display_name||'',
    row.email||'',
    row.user_id||'',
    row.joined_at||'',
    row.last_active_at||'',
    row.status||'',
    row.role||'student',
    row.current_lesson||'',
    row.progress_updated_at||'',
  ]);

  sheet.clearContents();
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  if(values.length)sheet.getRange(2,1,values.length,headers.length).setValues(values);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1,headers.length);
}

function installHourlyUserDirectorySync(){
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='syncUserDirectory').forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncUserDirectory').timeBased().everyHours(1).create();
}
