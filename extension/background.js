(()=>{
	let through = [];
	let buttonEnabled = [];
	const colors = {green:'#05E35E',red:'#E2041B',blue:'#058AE3',gray:'#808080',black:'#000000'};
	const buttonState = (bool, tabId)=>{
		bool ? buttonEnabled.push(tabId) : (buttonEnabled = buttonEnabled.filter(v=>v !== tabId));
	};
	const timer = (ms, tabId)=>{
		chrome.alarms.create(tabId + '', {when: Date.now() + ms});
	};
	const joinHeaders = (headers)=>{
		headers = headers.filter(v=>!v.name.includes('sec-ch-ua'))
		.map(v=>`"${v.name}":"${v.value}"`)
		.join(',\n');
		return `{${headers}}`;
	};
	const getPssh = async(tabId, dash)=>{
		await fetch(decodeURIComponent(dash))
		.then(response=>response.text())
		.then(text=>/(?<=widevine.+?pssh>).+?(?=<)/s.exec(text)[0])
		.then(async(v)=>{
			await chrome.storage.local.set({[`${tabId}__pssh`]:v});
		});
	};
	const postData = async(tabId)=>{
		let success = false;
		const obj = await chrome.storage.local.get([`${tabId}__headers`,`${tabId}__cenc`,`${tabId}__pssh`,`${tabId}__dash`,`${tabId}__title`]);
		const arr = Object.entries(obj);
		const data = {};
		for(let i = 0, l = arr.length; i <l; i++) {
			data[arr[i][0].split('__')[1]] = arr[i][1];
		}
		await fetch('http://localhost:8000/',{
			method:'POST',
			mode:'cors',
			headers:{
				'Content-Type':'text/plain'
			},
			body:JSON.stringify(data)
		})
		.then(()=>{
			success = true;
		})
		.catch(e=>{})
		.finally(()=>{
			chrome.action.setBadgeBackgroundColor({color:colors[success?'green':'red'],tabId:tabId});
		});
	};
	const sanitize = (str)=>{
		const before = ['\\','/',':','*','?','\"','<','>','|','　'];
		const after = ['￥','／','：','＊','？','”','＜','＞','｜',' '];
			for(let i = 0, l = before.length; i < l; i++) {
				str = str.split(before[i]).join(after[i]);
			}
		return str;
	};
	const storageOnChangedCallback = (changes, areaName)=>{
		const arr = Object.entries(changes);
		const tabId = arr[0][0].split('__')[0] - 0;
		if(!through.includes(tabId) && 'newValue' in arr[0][1]) {
			console.log(changes);
			(async()=>{
				const obj = await chrome.storage.local.get([`${tabId}__headers`,`${tabId}__cenc`,`${tabId}__pssh`,`${tabId}__dash`,`${tabId}__title`]);
				if(arr[0][0].includes('__pssh')) {console.log('a');
					through.push(tabId);
					buttonState(true, tabId);
					chrome.action.setBadgeBackgroundColor({color:colors.blue,tabId:tabId});
					console.log(`[Finish] ${obj[`${tabId}__title`]}`);
					return;
				}
				if(arr[0][0].includes('__headers') && Object.entries(obj).length === 3) {
					await chrome.scripting.executeScript({
						target: {tabId:tabId},
						func: ()=>document.querySelector('h1').innerText
					})
					.then(async(v)=>{
						await chrome.storage.local.set({[`${tabId}__title`]:sanitize(v[0].result)});
					});
					await getPssh(tabId,obj[`${tabId}__dash`]);
				}
			})();
		}
	};
	const tabsOnUpdatedCallback = (tabId, changeInfo, tab)=>{
		if(['https://gyao.yahoo.co.jp/episode/','https://gyao.yahoo.co.jp/title/'].some(v=>tab.url.includes(v))) {
			if(changeInfo.status === 'loading') {
				(async()=>{
					const arr = [`${tabId}__headers`,`${tabId}__cenc`,`${tabId}__pssh`,`${tabId}__dash`,`${tabId}__title`];
					for(let i = 0, l = arr.length; i < l; i++) {
						await chrome.storage.local.remove(arr[i]);
					}
					through = through.filter(v=>v !== tabId);
					buttonEnabled = buttonEnabled.filter(v=>v !== tabId);
					buttonState(false, tabId);
					chrome.action.setBadgeText({text:' ',tabId:tabId});
					if(!tab.title.includes('ページが見つかりませんでした')) {
						console.log(`[Start] ${tab.title}`);
						chrome.action.setBadgeBackgroundColor({color:colors.gray,tabId:tabId});
					} else {
						console.log('[404] Not Found');
						through.push(tabId);
						chrome.action.setBadgeBackgroundColor({color:colors.black,tabId:tabId});
					}
				})();
			}
		}
	};
	const tabsOnRemovedCallback = (tabId, removeInfo)=>{
		(async()=>{
			through = through.filter(v=>v !== tabId);
			const arr = [`${tabId}__headers`,`${tabId}__cenc`,`${tabId}__pssh`,`${tabId}__dash`,`${tabId}__title`];
			for(let i = 0, l = arr.length; i < l; i++) {
				await chrome.storage.local.remove(arr[i]);
			}
		})();
	};
	const onBeforeRequestFilter = {urls: ['https://manifest.prod.boltdns.net/manifest/*','https://manifest.prod.boltdns.net/license/*']};
	const onBeforeRequestCallback = (details)=>{
			const tabId = details.tabId;
			if(!through.includes(tabId) && !details.frameId) {
				if(details.url.includes('/hls/')) {
					through.push(tabId);
					chrome.action.setBadgeBackgroundColor({color:colors.black,tabId:tabId});
					console.log(`[Stop] Is Not DRM`);
					return;
				}
				(async()=>{
					const arr = ['dash','cenc'];
					const obj = await chrome.storage.local.get([`${tabId}__dash`,`${tabId}__cenc`]);
					for(let i = 0; i < 2; i++) {
						if(details.url.includes(`/${arr[i]}/`) && !(`__${arr[i]}` in obj)) {
							await chrome.storage.local.set({[`${tabId}__${arr[i]}`]:details.url});
							return;
						}
					}
				})();
			}
	};
	const onBeforeSendHeadersFilter = {urls: ['https://manifest.prod.boltdns.net/license/*']};
	const onBeforeSendHeadersCallback = (details)=>{
		const tabId = details.tabId;
		if(!through.includes(tabId)) {
			(async()=>{
				const obj = await chrome.storage.local.get(`${tabId}__headers`);
				if(!(`__headers` in obj)) {
					const headers = joinHeaders(details.requestHeaders);
					await chrome.storage.local.set({[`${tabId}__headers`]:headers});
				}
			})();
		}
	};
	const alarmsOnAlarmCallback = (alarm)=>{
		buttonState(true, alarm.name - 0);
	};
	const actionOnClickedCallback = (tab)=>{
		buttonEnabled.includes(tab.id) && (async()=>{
			buttonState(false, tab.id);
			await postData(tab.id);
			timer(2000, tab.id);
		})();
	};
	const runtimeOnCallback = ()=>{
		(async()=>{
			await chrome.storage.local.clear();
			console.log('[Init] Remove All Data');
		})();
	};
	chrome.action.onClicked.addListener(actionOnClickedCallback);
	chrome.alarms.onAlarm.addListener(alarmsOnAlarmCallback);
	chrome.runtime.onInstalled.addListener(runtimeOnCallback);
	chrome.runtime.onStartup.addListener(runtimeOnCallback);
	chrome.storage.onChanged.addListener(storageOnChangedCallback);
	chrome.tabs.onRemoved.addListener(tabsOnRemovedCallback);
	chrome.tabs.onUpdated.addListener(tabsOnUpdatedCallback);
	chrome.webRequest.onBeforeRequest.addListener(onBeforeRequestCallback,onBeforeRequestFilter,['requestBody','extraHeaders']);
	chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeadersCallback,onBeforeSendHeadersFilter,['requestHeaders','extraHeaders']);
})();
