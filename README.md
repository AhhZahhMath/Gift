# * お し な が き *
MPD、License URLとヘッダ、PSSHをサーバーに送信するChrome用拡張機能。そしてデータを受信するためのローカルサーバーです。GYAO!でのみ動作します。


## 更新履歴
[最終更新: 2023-03-11 13:30](/CHANGELOG.md)

## なにができますか？
[こういうこと](https://ssbsblg.blogspot.com/2023/03/go-ahead.html)です。


## 動作環境
真価を発揮させるには WKS-KEYS が必要です。


### 参考
[WKS-KEYS｜初心者用](https://ssbsblg.blogspot.com/2023/03/wks-keys-for-beginners.html)  
[「無」からCDMを取り出す](https://ssbsblg.blogspot.com/2023/03/make-cdm-from-null.html)  


## インストール
- extensionフォルダを[拡張機能ページ](chrome://extensions/)にドロップします。  
（拡張機能のデベロッパーモードが有効になっている必要があります）
- server.py、main.bat を l3.py と同じディレクトリに配置します。


## 必要なこと
1) このコードを l3_mod.py として保存します。  
（場所は l3.py と同じ）

```python
import requests
from pywidevine.L3.cdm import deviceconfig
from base64 import b64encode
from pywidevine.L3.decrypt.wvdecryptcustom import WvDecrypt

def WV_Function(headers, pssh, lic_url):
	wvdecrypt = WvDecrypt(init_data_b64=pssh, cert_data_b64=None, device=deviceconfig.device_android_generic)
	widevine_license = requests.post(url=lic_url, data=wvdecrypt.get_challenge(), headers=headers)
	license_b64 = b64encode(widevine_license.content)
	wvdecrypt.update_license(license_b64)
	Correct, keyswvdecrypt = wvdecrypt.start_process()
	if Correct:
		return keyswvdecrypt
```

2) お使いの環境に合わせて main.bat を編集します。

### 参考
[command.txt](https://ssbsblg.blogspot.com/2023/03/command-txt.html)


## 使い方
1) サーバーを起動する。
2) 動画ページを開く。
3) 青色が点灯してから拡張機能ボタンを押す。


## 補足
- ひとたびインジケーターが青色になれば、タブをリロードしない限りデータは保持されたままです。  
サーバーの起動し忘れなどで送信失敗したとしても、またボタンを押せば同じデータが送信されます。  
(誤操作防止のため、ボタンには2秒間のタイムアウトを設定しています)

- main.bat は server.py の子プロセスとして実行されます。  
途中で server.py を閉じると、処理中のバッチファイルも閉じられます。

- 8000番ポートを使用します。  
もしも使用中の場合は変更することも可能です。  
server.py の最終行、background.js の33行目に該当の数値があります。


## 作った人
- [@AhhZahhMath (aka Sasabee)](https://note.com/sasabee)

noteから金銭的なサポートをしていただけると、とても励みになります。  
[noteの記事](https://note.com/sasabee/n/n6557be19006f)の下部にサポートボタンがありますので、よろしくお願いします。
