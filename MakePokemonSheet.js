/*
  PokeAPIを利用して第一世代のポケモンの番号・名前・説明文・画像へのURLをGoogleのスプレッドシートに書き出すAppsScriptのサンプル
  PokeAPIに関するドキュメントは > https://pokeapi.co/docs/v2
 
  Google Sheetsを使用しているためサービスの「＋」を押して追加してください。
  makePokemonSheet()を呼び出すとPokemonという名のスプレッドシートがGoogleドライブ上に作成されます。
  すでに同名のスプレッドシートがある場合、そのスプレッドシートはゴミ箱に移動されます。
*/

//  PokeAPIのエントリ
const url = 'https://pokeapi.co/api/v2/';

// -------------------------------------------------------------
//  [makePokemonSheet]
//    in  @ none
//    out @ none
async function makePokemonSheet(){

  // 並列で実行されてない・・・
  await Promise.all( [...Array(151)].map( async (_,i) => await getPokemonData(i+1) ) ).then((value)=>{
    
    //  ポケモンデータを取得できた場合    
    console.log(value);

    //  スプレッドシートを作成して記述する
    return makeSheet(value);

  }).then((value)=>{

    console.log(value);

  }).catch((error)=>{

    //  エラーが発生した場合
    console.error(error);

  });
}

// -------------------------------------------------------------
//  [getPokemonData]
//    in  @ id : Number
//    out @ Promise( resolve: { id:Number, name:String, imageURL:String, flavorText:String }, reject: Error )
function getPokemonData(id) {

  return new Promise((resolve,reject)=>{
    //console.log('ID'+id+' start: '+(new Date()).getTime());
    try{

      // ポケモンのデータを取得
      let pokemonRes = UrlFetchApp.fetch(url+'pokemon/'+id);

      // HTTPレスポンスのボディを文字列にしてさらにJSONオブジェクトに変換
      let pokemonJsonObj = JSON.parse(pokemonRes.toString());
      //console.log(pokemonJsonObj);

      // ポケモン画像データへのURL
      //console.log(pokemonJsonObj['sprites']['front_default']);
      //console.log(pokemonJsonObj['sprites']['other']['official-artwork']['front_default']);
      //console.log(pokemonJsonObj['sprites']['versions']['generation-i']['red-blue']['front_gray']);

      // 種族データへのURL
      let speciesURL = pokemonJsonObj['species']['url'];
      let speciesRes = UrlFetchApp.fetch(speciesURL);
    
      // HTTPレスポンスのボディを文字列にしてさらにJSONオブジェクトに変換
      let speciesJsonObj = JSON.parse(speciesRes.toString());
      //console.log(speciesJsonObj);

      // ひらカタ -> ひらがなカタカナ の アクロニムで ja-Hrkt の シノニム

      // 種族名を ひらカタ で 検索
      let name = speciesJsonObj['names'].find( (v) => v['language']['name']==='ja-Hrkt' );
      //console.log(name);

      // フレーバーテキストを ひらカタ でフィルタリング
      let filteredFlavorTextEntries = speciesJsonObj['flavor_text_entries'].filter( (v) => v['language']['name'] === 'ja-Hrkt' );
      //console.log(filteredFlavorTextEntries);

      // フレーバーテキストのバージョンを sword で 検索
      let flavorText = filteredFlavorTextEntries.find( (v) => v['version']['name'] === 'sword' );
      //console.log(flavorText);

      if( typeof flavorText === 'undefined' ){
        // フレーバーテキストのバージョンを x で 検索
        flavorText = filteredFlavorTextEntries.find( (v) => v['version']['name'] === 'x' );
        //console.log(flavorText);
      }

      // let output = {
      //   'id' : id,
      //   'imageURL' : pokemonJsonObj['sprites']['front_default'],
      //   'name' : name['name'],
      //   'flavorText' : flavorText['flavor_text']
      // };
      let output = [ id, name['name'], flavorText['flavor_text'], pokemonJsonObj['sprites']['front_default'] ];
      //console.log(output);
      resolve(output);
  
    }catch(error){
      reject(error);
    }
    //console.log('ID'+id+' end: '+(new Date()).getTime());
  });
}

// -------------------------------------------------------------
//  [makeSheet]
//    in  @ id : Array[ id:Number, name,String, flavorText:String, imageURL: String ]
//    out @ Promise( resolve: undefined, reject: Error )
function makeSheet(arrayPokemon){
  return new Promise((resolve,reject)=>{  
    try{

      // Pokemonという名前のスプレッドシートがあればゴミ箱に移動する
      let files = DriveApp.getFilesByName('Pokemon');
      while( files.hasNext() ){
        let file = files.next();
        if( file.getMimeType() === 'application/vnd.google-apps.spreadsheet' ){
          console.log('fileName: '+file.getName()+' ('+file.getId()+') trashed.');
          file.setTrashed(true);
        }
      }

      // スプレッドシートの新規作成
      let sheet = Sheets.newSpreadsheet();
      sheet.properties = Sheets.newSpreadsheetProperties();
      sheet.properties.title = 'Pokemon';
  
      const spreadsheet = Sheets.Spreadsheets.create(sheet);

      // 作成したスプレッドシートのファイルID
      let spreadsheetFileId = spreadsheet.spreadsheetId;

      console.log(spreadsheetFileId);
      console.log(spreadsheet);
      console.log(spreadsheet.sheets[0]);

      // 新規作成したスプレッドシートのシート名を変更
      {
        // シートのプロパティを更新するリクエストを作成
        let sheetPropertiesReq = Sheets.newUpdateSheetPropertiesRequest();
        sheetPropertiesReq.fields = 'title';
        sheetPropertiesReq.properties = Sheets.newSheetProperties();
        sheetPropertiesReq.properties.sheetId = 0;
        sheetPropertiesReq.properties.title = '1st Generation';
        console.log(sheetPropertiesReq);

        // リクエストを作成
        let requests = Sheets.newRequest();
        requests.updateSheetProperties = sheetPropertiesReq;

        // スプレッドシートのバッチアップデート用のリクエストを作成
        let batchUpdateRequest = Sheets.newBatchUpdateSpreadsheetRequest();
        batchUpdateRequest.requests = requests;

        // シート名変更のバッチアップデートを実行
        Sheets.Spreadsheets.batchUpdate(batchUpdateRequest,spreadsheetFileId);
      }

      //　シートのセルに書き込む      
      {

        let valueRange2 = Sheets.newValueRange();
        valueRange2.range = '1st Generation!A1:D1';
        valueRange2.values = [['ID','NAME','TEXT','IMAGE']];

        let valueRange1 = Sheets.newValueRange();
        valueRange1.range = '1st Generation!A2:D'+(arrayPokemon.length+1);
        valueRange1.values = arrayPokemon;

        let batchUpdateRequest = Sheets.newBatchUpdateValuesRequest();
        batchUpdateRequest.data = [valueRange1,valueRange2];
        batchUpdateRequest.valueInputOption = 'USER_ENTERED';

        const result = Sheets.Spreadsheets.Values.batchUpdate( batchUpdateRequest, spreadsheetFileId );
      }

      resolve();

    }catch(error){
      reject(error);
    }
  });

}

