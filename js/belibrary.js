/**
 * /assets/js/belibrary.js
 * 
 * My own personal libraries that pack many goodies and
 * stuff into it.
 * 
 * This file is licensed under the MIT License.
 * See LICENSE in the project root for license information.
 * 
 * @author		Belikhun
 * @version		1.0
 * @license		MIT
 * @copyright	2018-2023 Belikhun
 */

const HTTP_STATUS_MESSAGES = {
	100: `Continue`,
	101: `Switching Protocols`,
	102: `Processing`,

	// 2×× Success
	200: `OK`,
	201: `Created`,
	202: `Accepted`,
	203: `Non-authoritative Information`,
	204: `No Content`,
	205: `Reset Content`,
	206: `Partial Content`,
	207: `Multi-Status`,
	208: `Already Reported`,
	226: `IM Used`,

	// 3×× Redirection
	300: `Multiple Choices`,
	301: `Moved Permanently`,
	302: `Found`,
	303: `See Other`,
	304: `Not Modified`,
	305: `Use Proxy`,
	307: `Temporary Redirect`,
	308: `Permanent Redirect`,

	// 4×× Client Error
	400: `Bad Request`,
	401: `Unauthorized`,
	402: `Payment Required`,
	403: `Forbidden`,
	404: `Not Found`,
	405: `Method Not Allowed`,
	406: `Not Acceptable`,
	407: `Proxy Authentication Required`,
	408: `Request Timeout`,
	409: `Conflict`,
	410: `Gone`,
	411: `Length Required`,
	412: `Precondition Failed`,
	413: `Payload Too Large`,
	414: `Request-URI Too Long`,
	415: `Unsupported Media Type`,
	416: `Requested Range Not Satisfiable`,
	417: `Expectation Failed`,
	418: `I'm a teapot`,
	421: `Misdirected Request`,
	422: `Unprocessable Entity`,
	423: `Locked`,
	424: `Failed Dependency`,
	426: `Upgrade Required`,
	428: `Precondition Required`,
	429: `Too Many Requests`,
	431: `Request Header Fields Too Large`,
	444: `Connection Closed Without Response`,
	451: `Unavailable For Legal Reasons`,
	499: `Client Closed Request`,

	// 5×× Server Error
	500: `Internal Server Error`,
	501: `Not Implemented`,
	502: `Bad Gateway`,
	503: `Service Unavailable`,
	504: `Gateway Timeout`,
	505: `HTTP Version Not Supported`,
	506: `Variant Also Negotiates`,
	507: `Insufficient Storage`,
	508: `Loop Detected`,
	510: `Not Extended`,
	511: `Network Authentication Required`,
	599: `Network Connect Timeout Error`,
}

/**
 * An AJAX function designed for my API
 * 
 * @param	{Object}													options					Request Options
 * @param	{String}													options.url				Request URL
 * @param	{"GET" | "POST" | "PUT" | "DELETE"}							[options.method="GET"]	Request Method
 * @param	{Object<string, string>}									[options.query]			Query/Param
 * @param	{Object<string, string>}									[options.form]			Form Data
 * @param	{Object<string, string>}									[options.json]			JSON Object
 * @param	{String}													[options.raw]			Raw data to send in request body
 * @param	{Object<string, string>}									[options.header]		Headers
 * @param	{"json" | "text"}											[options.type="json"]	Response type
 * @param	{(e: ProgressEvent<XMLHttpRequestEventTarget>)}				[options.onUpload]		Update upload progress
 * @param	{(e: ProgressEvent<XMLHttpRequestEventTarget>)}				[options.onDownload]	Update download progress
 * @param	{Boolean}													[options.force]			Force to send request even in offline mode
 * @param	{Boolean}													[options.changeState]	Change connection mode if request failed
 * @param	{Boolean}													[options.reRequest]		Re-send this request if connection back to online
 * @param	{Boolean}													[options.withCredentials]
 * @param	{Number}													[options.timeout]		Request timeout in second
 * @param	{Boolean}													[options.formEncodeURL]	Encode form
 * @param	{Function}													callout					On request success handler
 * @param	{({ code: Number, description: String, data: Object })}		error					On errored handler
 * @returns	{Promise<Object|String>}									A Promise thats resolve on request complete
 */
function myajax({
	url = "/",
	method = "GET",
	query = {},
	form = {},
	json = {},
	raw = null,
	header = {},
	type = "json",
	onUpload = () => {},
	onDownload = () => {},
	force = false,
	changeState = true,
	reRequest = true,
	withCredentials = false,
	timeout = 0,
	formEncodeURL = false
}, callout = () => {}, error = () => {}) {
	let argumentsList = arguments;

	// Only change state if request is from origin server.
	if (!ConnectionState.validHost(url))
		changeState = false;

	return new Promise(async (resolve, reject) => {
		if (ConnectionState.validHost(url) && ConnectionState.state !== "online" && force === false) {
			if (ConnectionState.haltRequests) {
				clog("WARN", {
					color: flatc("magenta"),
					text: method
				}, {
					color: flatc("pink"),
					text: url
				}, `Waiting for connection to back online`);

				await ConnectionState.backOnline();
			} else {
				let errorObj = {}
	
				switch (ConnectionState.state) {
					case "offline":
						errorObj = { code: 106, description: "Mất kết nối tới máy chủ" }
						break;
					case "ratelimited":
						errorObj = { code: 32, description: "Rate Limited" }
						break;
				}
	
				reject(errorObj);
				error(errorObj);
	
				return;
			}
		}

		let xhr = new XMLHttpRequest();
		let formData = null;
		method = method.toUpperCase();

		if (method !== "GET") {
			if (formEncodeURL) {
				formData = Array();

				for (let key of Object.keys(form))
					formData.push(`${key}=${encodeURIComponent(form[key])}`);

				formData = formData.join("&");
			} else {
				formData = new FormData();
				
				for (let key of Object.keys(form))
					formData.append(key, form[key]);
			}
		}

		let builtQuery = []
		for (let key of Object.keys(query))
			builtQuery.push(`${key}=` + encodeURIComponent(query[key]));
		
		url += (builtQuery.length > 0) ? `?${builtQuery.join("&")}` : "";
		// url = encodeURI(url);

		xhr.upload.addEventListener("progress", e => onUpload(e), false);
		xhr.addEventListener("progress", e => onDownload(e), false);

		xhr.addEventListener("readystatechange", async function() {
			let statusText = (typeof HTTP_STATUS_MESSAGES[this.status] !== "undefined")
				? HTTP_STATUS_MESSAGES[this.status]
				: this.statusText;

			if (this.readyState === this.DONE) {
				if (this.status === 0 && this.responseText === "") {
					if (changeState === true) {
						ConnectionState.change("offline");

						if (ConnectionState.haltRequests) {
							clog("WARN", {
								color: flatc("magenta"),
								text: method
							}, {
								color: flatc("pink"),
								text: url
							}, `Request halted! Waiting for connection to back online to resend request.`);
			
							await ConnectionState.backOnline();
	
							// Resend previous ajax request
							clog("DEBG", "Resending Request", argumentsList);
							let r = null;
	
							try {
								r = await myajax(...argumentsList);
							} catch(e) {
								reject(e);
								return;
							}
	
							// Resolve promise
							resolve(r);
							return;
						}
					}

					let errorObj = { code: 106, description: "Mất kết nối tới máy chủ" }
					reject(errorObj);
					error(errorObj);

					return;
				}

				if ((this.responseText === "" || !this.responseText) && this.status >= 400) {
					clog("ERRR", {
						color: flatc("magenta"),
						text: method
					}, {
						color: flatc("pink"),
						text: url
					}, {
						color: flatc("red"),
						text: `HTTP ${this.status}:`
					}, statusText);

					let errorObj = { code: 1, description: `HTTP ${this.status}: ${statusText} (${method} ${url})`, data: { status: this.status, method, url } }
					error(errorObj);
					reject(errorObj);

					return;
				}

				let response = null;

				if (type === "json") {
					try {
						response = JSON.parse(this.responseText);
					} catch (data) {
						clog("ERRR", "Lỗi phân tích JSON");

						let errorObj = { code: 2, description: `Lỗi phân tích JSON`, data: data }
						error(errorObj);
						reject(errorObj);

						return;
					}

					if (!response.status)
						response.status = this.status;

					if (this.status >= 400) {
						if (typeof response.code === "number" && response.code !== 0 && response.code < 100) {
							clog("ERRR", {
								color: flatc("magenta"),
								text: method
							}, {
								color: flatc("pink"),
								text: url
							}, {
								color: flatc("red"),
								text: `HTTP ${this.status}:`
							}, statusText, ` >>> ${response.description}`);
	
							if (this.status === 429 && response.code === 32 && reRequest === true) {
								// Wait for :?unratelimited:?
								await ConnectionState.change("ratelimited", response);
								
								// Resend previous ajax request
								clog("DEBG", "Resending Request", argumentsList);
								let r = null;
	
								try {
									r = await myajax(...argumentsList);
								} catch(e) {
									reject(e);
									return;
								}
	
								// Resolve promise
								resolve(r);
								return;
							}
						}

						let errorObj = {
							code: 3,
							description: (response.description)
								? `HTTP ${this.status} ${statusText}: ${response.description} (${method} ${url})`
								: `HTTP ${this.status} ${statusText} (${method} ${url})`,
							data: response
						}

						error(errorObj);
						reject(errorObj);

						return;
					}

					data = response;
				} else {
					response = this.responseText;

					if (this.status >= 400) {
						let code = `HTTP ${this.status}`;
						let text = (statusText === "") ? "?Unknown statusText" : statusText;
						let resData = response;

						let header = this.getResponseHeader("output-json");

						if (header) {
							let headerJSON = JSON.parse(header);

							if (!resData)
								resData = headerJSON;

							code = `HTTP ${headerJSON.status} [${headerJSON.code}]`
							text = headerJSON.description;
						}

						clog("ERRR", {
							color: flatc("magenta"),
							text: method
						}, {
							color: flatc("pink"),
							text: url
						}, {
							color: flatc("red"),
							text: `${code}:`
						}, text, ` >>> ${response.description}`);

						let errorObj = { code: 3, description: `${code}: ${text} (${method} ${url})`, data: resData }
						error(errorObj);
						reject(errorObj);

						return;
					}

					data = response;
				}

				callout(data);
				resolve(data);
			}
		})

		xhr.open(method, url);
		xhr.withCredentials = withCredentials;
		xhr.timeout = timeout;

		let sendData = (raw !== null)
			? raw
			: formData;

		for (let key of Object.keys(header))
			xhr.setRequestHeader(key, header[key]);

		if (method !== "GET") {
			if (formEncodeURL)
				xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	
			if (Object.keys(json).length !== 0) {
				sendData = JSON.stringify(json);
				xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			}
		}

		if (typeof header["Accept"] !== "string")
			xhr.setRequestHeader("Accept", `${type === "json" ? "application/json" : "text/plain"};charset=UTF-8`);

		xhr.send(sendData);
	});
}

var initGroupHandlers = {}

/**
 * Attach listener that will be called when a group is initialized.
 * 
 * @param {String}					name
 * @param {(group: object) => any}	f
 */
function onInitGroup(name, f) {
	if (typeof f !== "function")
		throw { code: -1, description: `onInitGroup(${name}): not a valid function!` }

	if (!initGroupHandlers[name])
		initGroupHandlers[name] = []

	initGroupHandlers[name].push(f);
}

/**
 * Initialize A Group Object
 * 
 * @param {Object}		group			The Target Object
 * @param {String}		name			Group Name
 * @param {Function}	set				Report Progress to Initializer
 */
async function initGroup(group, name, set = () => {}) {
	let modulesList = []

	// Search for modules and initialize it
	set({ p: 0, m: name, d: `Scanning Modules Of ${name}` });

	for (let key of Object.keys(group)) {
		if (key === "super")
			continue;

		let item = group[key];
		if (item && !item.initialized && typeof item.init === "function") {
			// Set Up Module Constants
			item.__NAME__ = key;
			item.super = group;

			item.log = (level, ...args) => clog(level, {
				color: oscColor("pink"),
				text: truncateString(`${name}.${item.__NAME__}`, 34),
				padding: 34,
				separate: true
			}, ...args);

			// Push To Queues
			modulesList.push(item);
		}
	}

	if (modulesList.length === 0)
		return;

	// Sort modules by priority
	// The lower the value is, the higher the priority
	set({ p: 5, m: name, d: `Sorting Modules By Priority` });
	modulesList = modulesList.sort((a, b) => (a.priority || 0) - (b.priority || 0));

	if (modulesList.length > 0) {
		clog("DEBG", {
			color: oscColor("pink"),
			text: truncateString(name, 34),
			padding: 34,
			separate: true
		}, `Modules of`, {
			text: name,
			color: oscColor("pink")
		}, `(initialize from top to bottom)`);

		for (let [i, module] of modulesList.entries())
			clog("DEBG", {
				color: oscColor("pink"),
				text: truncateString(name, 34),
				padding: 34,
				separate: true
			}, " + ", pleft(i, 2), pleft(module.__NAME__, 38), pleft(module.priority || 0, 3));
	}

	// Initialize modules
	for (let i = 0; i < modulesList.length; i++) {
		let moduleStart = time();
		let item = modulesList[i];
		let path = `${name}.${item.__NAME__}`;
		let mP = 5 + (i / modulesList.length) * 95;

		set({ p: mP, m: path, d: `Initializing` });
		try {
			let returnValue = await item.init(({ p, m, d }) => set({
				p: mP + (p * (1 / modulesList.length) * 0.95),
				m: (m) ? `${path}.${m}` : path,
				d
			}), { clog: item.log });

			if (returnValue === false) {
				clog("INFO", {
					color: oscColor("pink"),
					text: truncateString(path, 34),
					padding: 34,
					separate: true
				}, `Module DISABLED! Skipping all Submodules`);

				item.initialized = false;
				continue;
			}

			if (initGroupHandlers[path]) {
				clog("INFO", {
					color: oscColor("pink"),
					text: truncateString(path, 34),
					padding: 34,
					separate: true
				}, `Handling module listeners...`);

				for (let f of initGroupHandlers[path]) {
					try {
						f(item);
					} catch(e) {
						clog("WARN", {
							color: oscColor("pink"),
							text: truncateString(path, 34),
							padding: 34,
							separate: true
						}, `An error occured when handing listener`, e);
						continue;
					}
				}
			}

			item.initialized = true;

			// Try to find and initialize submodules
			await this.initGroup(item, path, ({ p, m, d }) => set({ m, d }));
		} catch(error) {
			if (error.code === 12)
				throw error;

			let e = parseException(error);

			if (error instanceof Error) {
				clog("ERRR", {
					color: oscColor("pink"),
					text: truncateString(path, 34),
					padding: 34,
					separate: true
				}, `core.initGroup(${path}): ${e.description}`, e);
				throw error;
			}

			throw { code: 12, description: `core.initGroup(${path}): ${e.description}`, data: error }
		}

		clog("OKAY", {
			color: oscColor("pink"),
			text: truncateString(path, 34),
			padding: 34,
			separate: true
		}, `Initialized in ${time() - moduleStart}s`);
	}

	delete modulesList;
}

function delayAsync(time) {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(), time);
	});
}

function nextFrameAsync() {
	return new Promise((resolve, reject) => {
		requestAnimationFrame(() =>  resolve());
	});
}

function waitFor(checker = async () => {}, handler = () => {}, retry = 10, timeout = 1000, onFail = () => {}) {
	return new Promise((resolve, reject) => {
		let retryNth = 0;
		let doCheck = true;

		const __check = async () => {
			let result = false;

			try {
				result = await checker(retryNth + 1);
			} catch(e) {
				result = false;
			}

			if (!result) {
				retryNth++;
				clog("DEBG", `waitFor(): [${retryNth}/${retry}] check failed! recheck in ${timeout}ms...`);

				if (retryNth >= retry) {
					doCheck = false;
					onFail(retryNth);
					reject(`waitFor(): check failed after ${retryNth} check!`);
				}

				return;
			}

			clog("DEBG", `[${retryNth}/${retry}] check passed!`);
			doCheck = false;
			await handler(result);
			resolve(result);
		}

		const __checkHandler = async () => {
			if (!doCheck)
				return;

			let timeStart = time();
			await __check();
			setTimeout(() => __checkHandler(), timeout - ((time() - timeStart) * 1000));
		}

		__checkHandler();
	})
}

/**
 * Replace some special character with printable
 * character in html. Mainly use to avoid code
 * execution
 * 
 * @param 	{*} 	string	Input String
 * @returns	New String
 */
function escapeHTML(string) {
	if (typeof string !== "string")
		string = String(string);

	let map = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#039;"
	}

	return string.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Truncate String if String's length is too large
 * @param {String}	string	String to truncate 
 * @param {Number}	length	Maximum length of string
 * @returns {String}
 */
function truncateString(string, length = 20, {
	surfix = "..."
} = {}) {
	return (string.length > length)
		? string.substr(0, length - surfix.length - 1) + surfix
		: string;
}

/**
 * Return the first element with the given className
 * @param	{Element}	node			Container
 * @param	{String}	className		Class
 * @returns	{Element}
 */
function fcfn(node, className) {
	return node.getElementsByClassName(className)[0];
}

/**
 * @param	{String}	HTML representing a single element
 * @return	{Element}
 */
function htmlToElement(html) {
	let template = document.createElement("template");
	template.innerHTML = html.trim();
	
	return template.content.firstChild;
}

/**
 * This function is Deprecated!. Avoid using
 * this function as much as possible.
 * 
 * Please use `makeTree()` instead!
 * 
 * @param	{String}			type
 * @param	{String|String[]}	__class
 * @param	{Object[]}			data
 * @param	{String}			__keypath
 * @deprecated	Please use `makeTree()` instead!
 */
function buildElementTree(type = "div", __class = [], data = new Array(), __keypath = "") {
	let svgTag = ["svg", "g", "path", "line", "circle", "polyline"]

	/** @type {HTMLElement|SVGElement} */
	let tree = (svgTag.includes(type))
		? document.createElementNS("http://www.w3.org/2000/svg", type)
		: document.createElement(type);
	
	if (typeof __class == "string")
		__class = new Array([__class]);
	tree.classList.add.apply(tree.classList, __class);

	/** @type {HTMLElement} */
	let objtree = tree;

	for (let i = 0; i < data.length; i++) {
		let d = data[i];
		let k = __keypath + (__keypath === "" ? "" : ".") + d.name;

		if (typeof d.list === "object") {
			let t = buildElementTree(d.type, d.class, d.list, k);

			t.tree.dataset.name = d.name;
			t.tree.dataset.path = k;
			(d.id) ? t.tree.id = d.id : 0;
			(d.for) ? t.tree.htmlFor = d.for : 0;
			(d.inpType) ? t.tree.type = d.inpType : 0;
			(d.html) ? t.tree.innerHTML = d.html : 0;
			(d.text) ? t.tree.innerText = d.text : 0;

			if (typeof d.data === "object")
				for (let key of Object.keys(d.data))
					t.tree.dataset[key] = d.data[key];
			
			tree.appendChild(t.tree);

			objtree[d.name] = t.tree;
		} else if (typeof d === "object") {
			if (typeof d.node === "object") {
				let node = (d.node.group && d.node.group.classList)
					? d.node.group
					: (d.node.container && d.node.container.classList)
						? d.node.container
						: d.node;

				node.dataset.name = d.name;
				node.dataset.path = k;

				tree.appendChild(node);
				objtree[d.name] = d.node;

				continue;
			}

			let t = (svgTag.includes(d.type))
				? document.createElementNS("http://www.w3.org/2000/svg", d.type)
				: document.createElement(d.type);

			if (typeof d.class == "string")
				d.class = new Array([d.class]);

			t.classList.add.apply(t.classList, d.class);
			t.dataset.name = d.name;
			t.dataset.path = k;
			(d.id) ? t.id = d.id : 0;
			(d.for) ? t.htmlFor = d.for : 0;
			(d.inpType) ? t.type = d.inpType : 0;
			(d.html) ? t.innerHTML = d.html : 0;
			(d.text) ? t.innerText = d.text : 0;

			if (typeof d.data === "object")
				for (let key of Object.keys(d.data))
					t.dataset[key] = d.data[key];

			tree.appendChild(t);
			objtree[d.name] = t;
		}
	}

	return {
		obj: objtree,
		tree: tree
	}
}

/**
 * @typedef {"div" | "span" | "a" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "table" | "thead"
 * 			| "tbody" | "tr" | "th" | "td" | "input" | "img" | "video" | "audio" | "iframe" | "b"
 * 			| "canvas" | "code" | "em" | "footer" | "form" | "hr" | "i" | "label" | "ul" | "ol"
 * 			| "li" | "meta" | "nav" | "option" | "optgroup" | "param" | "picture" | "pre" | "q"
 * 			| "s" | "script" | "strong" | "style" | "svg" | "textarea"} MakeTreeHTMLTags
 */

/**
 * Object represent the DOM structure will be passed into `makeTree()`
 * @typedef {{
 * 	id: String
 * 	tag: MakeTreeHTMLTags
 * 	text: String
 * 	for: String
 * 	data: Object<string, string>
 * 	attribute: Object<string, string>
 * 	class: string | string[]
 * 	child: Object<string, TreeObject>
 *	src: String
 * 	href: String
 * }} TreeObject
 */

/**
 * Object represent structure returned by `makeTree()`
 * @typedef {{
 * 	[x: string]: TreeDOM
 * } & HTMLElement & HTMLInputElement} TreeDOM
 */

/**
 * This is the replacement of `buildElementTree()`
 * 
 * @param	{String}						tag			Tag Name
 * @param	{String|String[]}				classes		Classes
 * @param	{Object<string, TreeObject>}	child		Child List
 * @param	{String}						path		Path (optional)
 * @returns	{TreeDOM}
 */
function makeTree(tag, classes, child = {}, path = "") {
	let container = document.createElement(tag);
	
	switch (typeof classes) {
		case "string":
			container.classList.add(classes);
			break;
		
		case "object":
			if (classes.length && classes.length > 0)
				container.classList.add(...classes);
			else
				throw { code: -1, description: `makeTree(${path}): Invalid or empty "classes" type: ${typeof classes}` }

			break;
	}

	// If child list is invalid, we can just stop parsing
	// now
	if (typeof child !== "object")
		return container;

	let keys = Object.keys(child);

	for (let key of keys) {
		if (typeof child[key] !== "object" || child[key] === null || child[key] === undefined)
			continue;

		let item = child[key];
		let currentPath = (path === "")
			? key
			: `${path}.${key}`

		if (typeof container[key] !== "undefined")
			throw { code: -1, description: `makeTree(${currentPath}): Illegal key name: "${key}"` }

		/**
		 * If node key is defined and is an object, this is
		 * possibility a custom element data
		 * 
		 * Example: `createInput()`
		 */
		let customNode;

		try {
			customNode = (item.group && item.group.classList)
				? item.group
				: (item.container && item.container.classList)
					? item.container
					: (item.classList)
						? item
						: null;
		} catch(e) {
			throw { code: -1, description: `makeTree(${currentPath}): Custom node parse failed!`, data: e }
		}

		if (customNode) {
			customNode.setAttribute("key", key);
			customNode.dataset.path = currentPath;
			container.appendChild(customNode);
			container[key] = item;
			
			continue;
		}

		// Normal Building
		if (typeof item.tag !== "string")
			throw { code: -1, description: `makeTree(${currentPath}): Invalid or undefined "tag" value` }

		/** @type {HTMLElement} */
		let node = makeTree(item.tag, item.class, item.child, currentPath);
		node.dataset.path = currentPath;

		if (typeof item.html === "string")
			node.innerHTML = item.html;

		if (typeof item.text !== "undefined")
			node.innerText = item.text;

		if (typeof item.for === "string")
			node.htmlFor = item.for;

		if (typeof item.data === "object") {
			for (let key of Object.keys(item.data))
				node.dataset[key] = item.data[key];
		}

		if (typeof item.attribute === "object") {
			for (let key of Object.keys(item.attribute))
				node.setAttribute(key, item.attribute[key]);
		}

		// Special rule for icon tag
		if (item.tag === "icon" && typeof item.icon === "string")
			node.dataset.icon = item.icon;

		for (let key of Object.keys(item)) {
			if (!["tag", "class", "child", "html", "for", "text", "data", "attribute"].includes(key) && typeof node[key] !== "undefined")
				node[key] = item[key];
		}

		node.setAttribute("key", key);
		container.appendChild(node);
		container[key] = node;
	}

	return container;
}

/**
 * @typedef {{
 * 	code: Number
 * 	description: String
 * 	online: Boolean
 * 	address: String
 * }} CheckServerResponse
 * 
 * @param	{String}								host 
 * @param	{(data: CheckServerResponse) => any}	callback 
 * @returns	{Promise<CheckServerResponse>}
 */
function checkServer(host, callback = () => {}) {
	return new Promise((resolve) => {
		let xhr = new XMLHttpRequest();
		let pon = {};

		xhr.addEventListener("readystatechange", function() {
			if (this.readyState === this.DONE) {
				if (this.status === 0) {
					pon = {
						code: -1,
						description: `Server "${host}" is Offline`,
						online: false,
						address: host
					}

					resolve(pon);
				} else {
					pon = {
						code: 0,
						description: `Server "${host}" is Online`,
						online: true,
						address: host
					}

					resolve(pon);
				}

				callback(pon);
			}
		})

		xhr.open("GET", `${host}/ping.html`);
		xhr.send();
	})
}

function time(date) {
	if (date instanceof Date)
		return date.getTime() / 1000;

	return Date.now() / 1000;
}

/**
 * Is date today??
 * 
 * @param	{Date}	date
 * @param	{Date}	today	Date to compare to
 */
function isToday(date, today = new Date()) {
	return (date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear())
}

/**
 * Get current Week in a year
 * 
 * @returns {Number}	Current Week
 */
Date.prototype.getWeek = function() {
	let date = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
	let dayNum = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayNum);
	let yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

function parseTime(t = 0, {
	forceShowHours = false,
	msDigit = 3,
	showPlus = false,
	strVal = true,
	calcDays = false
} = {}) {
	const d = showPlus ? "+" : "";
	let days = 0;
	
	if (t < 0) {
		t = -t;
		d = "-";
	}

	if (calcDays) {
		days = Math.floor(t / 86400);
		t %= 86400;
	}
	
	const h = Math.floor(t / 3600);
	const m = Math.floor(t % 3600 / 60);
	const s = Math.floor(t % 3600 % 60);
	const ms = pleft(parseInt(t.toFixed(msDigit).split(".")[1]), msDigit);

	return {
		h, m, s, ms, d,
		days,
		str: (strVal)
			? d + [h, m, s]
				.map(v => v < 10 ? "0" + v : v)
				.filter((v, i) => i > 0 || forceShowHours || v !== "00")
				.join(":")
			: null
	}
}

/**
 * Date to human readable time
 * 
 * @param	{Date}			date		Date to display
 * @param	{Boolean}		beautify	Will return beautified html code
 * @return	{String}
 */
function humanReadableTime(date, {
	beautify = false,
	onlyDate = false,
	alwayShowSecond = false
} = {}) {
	let dateString = `${pleft(date.getDate(), 2)}/${pleft(date.getMonth() + 1, 2)}/${date.getFullYear()}`;

	if (onlyDate)
		return dateString;

	let timeString = `${pleft(date.getHours(), 2)}:${pleft(date.getMinutes(), 2)}`;
	if (date.getSeconds() > 0 || alwayShowSecond)
		timeString += `:${pleft(date.getSeconds(), 2)}`;

	return beautify
		? `<b>${timeString}</b> ${dateString}`
		: `${timeString} ${dateString}`;
}

function formatTime(seconds, {
	ended = "Đã kết thúc",
	now = "bây giờ",
	prefix = "",
	surfix = "",
	minimal = false,
	endedCallback = () => {}
} = {}) {
	let time = { năm: 31536000, ngày: 86400, giờ: 3600, phút: 60, giây: 1 },
		res = [];

	if (seconds === 0)
		return now;

	if (seconds < 0) {
		endedCallback();
		return ended;
	}

	for (let key in time)
		if (minimal) {
			if (seconds > time[key]) {
				res[0] = `${Math.floor(seconds / time[key])} ${key}${surfix}`
				break;
			}
		} else {
			if (seconds >= time[key]) {
				let val = Math.floor(seconds / time[key]);
				res.push(`${val} ${key}${surfix}`);
				seconds = seconds % time[key];
			}
		}

	return prefix + (res.length > 1)
		? res.join(", ").replace(/,([^,]*)$/, " và" + "$1")
		: res[0];
}

/**
 * Generate readable relative time
 * @param	{Number}	timestamp			UNIX time
 * @param	{Object}	options
 * @param	{Number}	options.to			Relative to (default now)
 * @param	{Boolean}	options.returnNode	Return time as node
 * @return	{HTMLElement|String}
 */
function relativeTime(timestamp, {
	to = time(),
	returnNode = false
} = {}) {
	let string;

	if (timestamp === to) {
		string = "mới đây";
	} else {
		const units = { năm: 31536000, ngày: 86400, giờ: 3600, phút: 60, giây: 1 }
		let delta = Math.abs(timestamp - to);
		let future = timestamp > to;
	
		let unit, value;
		for (unit of Object.keys(units)) {
			value = delta / units[unit];
			
			if (value > 1)
				break;
		}
	
		if (unit === "ngày" && value === 1) {
			string = (future) ? "ngày mai" : "hôm qua";
		} else if (unit === "năm" && value === 1) {
			string = (future) ? "năm sau" : "năm ngoái";
		} else {
			string = `${value.toFixed(0)} ${unit} ${future ? "sau" : "trước"}`;
		}
	}

	if (returnNode) {
		let node = document.createElement("relative-time");
		node.setAttribute("timestamp", timestamp);
		node.title = humanReadableTime(new Date(timestamp * 1000));
		node.innerText = string;
		return node;
	}

	return string;
}

function liveTime(element, start = time(new Date()), {
	type = "full",
	count = "up",
	prefix = "",
	surfix = "",
	ended = "Đã kết thúc",
	endedCallback = () => {},
	interval = 1000
} = {}) {
	let updateInterval = setInterval(() => {
		if (!document.body.contains(element)) {
			clog("DEBG", "Live Time Element does not exist in document. Clearing...");
			clearInterval(updateInterval);
		}

		let t = 0;
		let ts = "";
		let parsed = null;

		if (count === "up")
			t = time() - start;
		else
			t = start - time();

		switch (type) {
			case "full":
				ts = formatTime(t, { ended: ended, endedCallback: () => endedCallback(element) });
				break;

			case "simple":
				if (t < 0) {
					endedCallback(element);
					ts = ended;
					break;
				}

				parsed = parseTime(t % 86400, { forceShowHours: true, showPlus: true });
				ts = `<timer><days>${Math.floor(t / 86400)}</days>${parsed.str}<ms>${parsed.ms}</ms></timer>`;
				break;

			case "minimal":
				if (t < 0) {
					endedCallback(element);
					ts = ended;
					break;
				}
				
				parsed = parseTime(t % 86400, { forceShowHours: true, showPlus: true });
				ts = `<timer><days>${Math.floor(t / 86400)}</days>${parsed.str}</timer>`;
				break;
		
			default:
				ts = `Unknown clock type: ${type}`;
				break;
		}

		element.innerHTML = `${prefix}${ts}${surfix}`;

		if (t < 0)
			clearInterval(updateInterval);
	}, interval);
}

/**
 * Set date and time input to a specified time
 * @param	{HTMLInputElement}		dateNode	Date Input
 * @param	{HTMLInputElement}		timeNode	Time Input
 * @param	{Number}				value		UNIX Time
 */
 function setDateTimeValue(dateNode, timeNode, value = time()) {
	let date = new Date(value * 1000);

	if (typeof dateNode === "object" && dateNode)
		dateNode.value = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(i => pleft(i, 2)).join("-");

	if (typeof timeNode === "object" && timeNode)
		timeNode.value = [date.getHours(), date.getMinutes(), date.getSeconds()].map(i => pleft(i, 2)).join(":");
}

function getDateTimeValue(dateNode, timeNode) {
	return time(new Date(`${dateNode.value}T${timeNode.value}`));
}

/**
 * Return number of days between two dates
 * @param	{Date}	start	Start date
 * @param	{Date}	end		End date
 * @returns {Number}
 */
function daysBetween(start, end) {
	return (start.getTime() - end.getTime()) / (1000 * 3600 * 24);
}

function convertSize(bytes) {
	let sizes = ["B", "KB", "MB", "GB", "TB"];
	for (var i = 0; bytes >= 1024 && i < (sizes.length -1 ); i++)
		bytes /= 1024;

	return `${round(bytes, 2)} ${sizes[i]}`;
}

/**
 * Compare Version
 * @param	{String}			localVersion
 * @param	{String}			remoteVersion
 * @returns {String}	"major", "minor", "patch", "latest"
 */
function versionCompare(localVersion, remoteVersion, {
	ignoreTest = false
} = {}) {
	const regex = /^(?:v|)(\d)\.(\d)\.(\d)\-(.+)$/gm;
	let testTags = ["beta", "indev", "debug", "test"]
	let value = "latest";

	let localRe = regex.exec(localVersion); regex.lastIndex = 0;
	let remoteRe = regex.exec(remoteVersion);

	if (!localRe || !remoteRe)
		throw { code: -1, description: `versionCompare(${localVersion}, ${remoteVersion}): Invalid version string` }

	let local = { major: parseInt(localRe[1]), minor: parseInt(localRe[2]), patch: parseInt(localRe[3]), tag: localRe[4] }
	let remote = { major: parseInt(remoteRe[1]), minor: parseInt(remoteRe[2]), patch: parseInt(remoteRe[3]), tag: remoteRe[4] }

	for (let key of ["major", "minor", "patch"])
		if (remote[key] > local[key]) {
			value = key;
			break;
		} else if (local[key] > remote[key])
			break;

	if (!ignoreTest && testTags.includes(remote.tag))
		return "latest";

	return value;
}

function priceFormat(num) {
	return num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

function numberFormat(num) {
	return new Intl.NumberFormat().format(num);
}

function round(number, to = 2) {
	const d = Math.pow(10, to);
	return Math.round(number * d) / d;
}

/**
 * Returns a number whose value is limited to the given range.
 *
 * Example: limit the output of this computation to between 0 and 255
 * (x * 255).clamp(0, 255)
 *
 * @param		{Number}	value	The input value
 * @param		{Number}	min		The lower boundary of the output range
 * @param		{Number}	max		The upper boundary of the output range
 * @returns		{Number}	A number in the range [min, max]
 */
function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

class StopClock {
	/**
	 * Create a new StopClock instance
	 * @param {Date} date 
	 */
	constructor(date) {
		this.start = this.__time(date);
	}

	__time(date) {
		return (typeof date !== "undefined")
			? date.getTime()
			: performance.now();
	}

	get stop() {
		return (this.__time() - this.start) / 1000;
	}

	tick() {
		return this.stop;
	}
}

class Pager {
	constructor(container, showCount = 20) {
		if (!container.classList)
			throw { code: -1, description: `Pager: container is not a valid node` }

		this.container = container;
		this.listData = []
		this.renderItemHandler = () => {}
		this.updateHandler = () => {}
		this.filterHandler = null;
		this.showCount = showCount;
		this.apiEndpoint = null;
		this.apiToken = null;
		this.__currentPage = 1;
		this.__maxPage = 1;
	}

	/**
	 * @param {array} list
	 */
	set list(list) {
		if (typeof list !== "object" || typeof list.length !== "number")
			throw { code: -1, description: `(set) Pager.list: not a valid array` }

		this.listData = list;
		this.render();
	}

	/**
	 * @param {String|Object} api
	 */
	set api(api) {
		if ((typeof api !== "string" && typeof api !== "object") || !api.url || !api.token || api === null)
			throw { code: -1, description: `(set) Pager.api: not a valid string|data` }

		this.apiEndpoint = api.url || api;
		if (api.token)
			this.apiToken = api.token;
	}

	renderItem(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `Pager.renderItem(): not a valid function` }

		this.renderItemHandler = f;
	}

	onUpdate(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `Pager.onUpdate(): not a valid function` }

		this.updateHandler = f;
	}

	setFilter(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `Pager.setFilter(): not a valid function` }

		this.filterHandler = f;
	}

	async next() {
		this.__currentPage++;
		await this.render();
	}

	async back() {
		this.__currentPage--;
		await this.render();
	}

	async setPage(page) {
		if (typeof page !== "number" && !["first", "last"].includes(page))
			throw { code: -1, description: `Pager.setPage(${page}): not a valid number/command` }

		this.__currentPage = page;
		await this.render();
	}

	async render() {
		if (this.__currentPage < 1 || this.__currentPage === "first")
			this.__currentPage = 1;

		if (this.apiEndpoint) {
			if (this.__currentPage > this.__maxPage || this.__currentPage === "last")
				this.__currentPage = this.__maxPage;

			let response = {}
			try {
				response = await myajax({
					url: this.apiEndpoint,
					method: "POST",
					form: {
						action: "getData",
						token: this.apiToken,
						show: this.showCount,
						page: this.__currentPage
					}
				});
			} catch(e) {
				if (e.data.code === 6) {
					clog("WARN", `Không tồn tại trang ${this.currentPage} của nhật ký hệ thống.`, e.data.data);
					this.__currentPage = 1;
					this.__maxPage = e.data.data.maxPage;
					await this.render();

					return;
				}

				throw e;
			}

			this.__maxPage = response.data.maxPage
			this.updateHandler({
				total: response.data.total,
				maxPage: this.__maxPage,
				currentPage: this.__currentPage,
				from: response.data.from,
				to: response.data.to
			});

			emptyNode(this.container);
	
			for (let i = 0; i <= response.data.lists.length; i++)
				if (response.data.lists[i]) {
					let node = null;

					try {
						node = this.renderItemHandler(response.data.lists[i], this.container);
					} catch(e) {
						clog("ERRR", `Pager.render(): An error occured while processing handler for item`, response.data.lists[i], e);
						continue;
					}

					if (typeof node === "object" && node.classList && node.tagName)
						this.container.appendChild(node);
				} else
					clog("DEBG", `Pager.render(): listData does not contain data at index`, { text: i, color: flatc("red") });
		} else {
			let listData = (typeof this.filterHandler === "function")
				? this.listData.filter(this.filterHandler)
				: this.listData;

			let total = Math.max(listData.length, 1);
			let showCount = (this.showCount > 0)
				? this.showCount
				: total;

			let maxPage = parseInt(Math.floor(total / showCount) + ((total % showCount === 0) ? 0 : 1));
	
			if (this.__currentPage > maxPage || this.__currentPage === "last")
				this.__currentPage = maxPage;
	
			let from = (this.__currentPage - 1) * showCount;
			let to = Math.min(this.__currentPage * showCount - 1, total - 1);
	
			this.updateHandler({ total, maxPage, currentPage: this.__currentPage, from, to });
			emptyNode(this.container);
	
			for (let i = from; i <= to; i++)
				if (listData[i]) {
					let node = null;

					try {
						node = this.renderItemHandler(listData[i], this.container);
					} catch(e) {
						clog("ERRR", `Pager.render(): An error occured while processing handler for item`, listData[i], e);
						continue;
					}

					if (typeof node === "object" && node.classList && node.tagName)
						this.container.appendChild(node);
				} else
					clog("DEBG", `Pager.render(): listData does not contain data at index`, { text: i, color: flatc("red") });
		}
	}
}

class lazyload {
	constructor({
		container,
		source,
		classes,
		tagName = "div",
		spinner = "simpleSpinner",
		doLoad = true
	} = {}) {
		/** @type {HTMLElement} */
		this.container

		if (container && container.classList)
			this.container = container;
		else
			this.container = document.createElement(tagName);

		/** @type	{String}	Source */
		this._src = null;
		this.isLoaded = false;
		this.isErrored = false;
		this.onLoadedHandler = []
		this.onErroredHandler = null;

		this.container.classList.add("lazyload");

		if (classes)
			switch (typeof classes) {
				case "object":
					if (!Array.isArray(classes))
						throw { code: -1, description: `lazyload: classes is not a valid array` }

					this.container.classList.add(...classes);
					break;
					
				case "string":
					this.container.classList.add(classes);
					break;
			}

		this.source = source;
		this.spinner = document.createElement("div");
		this.spinner.classList.add(spinner);
		this.spinner.setAttribute("spinner", "true");
		this.container.append(this.spinner);

		if (doLoad)
			this.load();
	}

	load(src) {
		if (!this._src)
			return false;

		if (src)
			this._src = src;

		this.src = this._src;
		return true;
	}

	/**
	 * @param {String|Object} source
	 */
	set source(source) {
		let node;

		switch (typeof source) {
			case "string":
				// Assume as Image Src
				node = document.createElement("img");
				this._src = source;
				break;
		
			case "object":
				if (source.classList)
					// Source is a Node. We just need to append it in container
					node = source;
				else if (source.type && source.src) {
					switch (source.type) {
						case "image":
						case "iframe":
							node = document.createElement(source.type);
							this._src = source.src;
							break;

						case "document":
							node = document.createElement("embed");
							this._src = source.src;
							break;

						default:
							throw { code: -1, description: `lazyload: source.type >>> ${source.type} is not a valid type` }
					}
				} else
					throw { code: -1, description: `lazyload: source is not a valid node/object` }
				break;

			default:
				break;
		}

		if (node) {
			node.addEventListener("load", () => this.loaded = true);
			node.addEventListener("error", () => this.errored = true);

			if (this.sourceNode) {
				this.container.replaceChild(node, this.sourceNode);
				this.sourceNode = node;
			} else {
				this.container.insertBefore(node, this.container.firstChild);
				this.sourceNode = node;
			}
		}
	}

	/**
	 * @param {String} src
	 */
	set src(src) {
		if (!this.sourceNode)
			throw { code: -1, description: `lazyload: cannot load source because sourceNode hasn't been initialized properly` }

		this.loaded = false;
		this.errored = false;
		this.sourceNode.src = src;
	}

	/**
	 * @returns {String}
	 */
	get src() {
		return this.sourceNode.src;
	}

	/**
	 * @param {Boolean} val
	 */
	set loaded(val) {
		if (typeof val !== "boolean")
			throw { code: -1, description: `lazyload.loaded: not a valid boolean` }

		this.isLoaded = val;
		this.container.removeAttribute("data-errored");

		this.isLoaded
			? this.container.dataset.loaded = true
			: this.container.removeAttribute("data-loaded");

		for (let f of this.onLoadedHandler)
			f();
	}

	get loaded() {
		return this.isLoaded;
	}

	/**
	 * @param {Boolean} val
	 */
	set errored(val) {
		if (typeof val !== "boolean")
			throw { code: -1, description: `lazyload.errored: not a valid boolean` }

		this.isErrored = val;
		this.container.removeAttribute("data-loaded");

		this.isErrored
			? this.container.dataset.errored = true
			: this.container.removeAttribute("data-errored");
	}

	/** @returns {Boolean} */
	get errored() {
		return this.isErrored;
	}

	/**
	 * @param {Function}	f	Handler
	 */
	onLoaded(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `lazyload.onLoaded: not a valid function` }

		this.onLoadedHandler.push(f);
	}

	wait() {
		return new Promise((resolve, reject) => {
			if (this.loaded) {
				resolve();
				return;
			}

			this.onLoaded(() => resolve());
		});
	}

	/**
	 * @param {Function}	f	Handler
	 */
	onErrored(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `lazyload.onErrored: not a valid function` }

		this.onErroredHandler = f;
	}
}

class Queue {
	/**
	 * 
	 * @param {Array}	list 
	 */
	constructor(list) {
		this.queueList = []
		this.handlers = []
		this.completeHandlers = []
		this.queuePos = 0;
		this.handlerPos = 0;
	
		/**
		 * @type {Boolean}
		 */
		this.isLooping = true;

		/**
		 * @type {Boolean}	Running state of Queue
		 */
		this.running = false;

		this.list = list;
	}

	/**
	 * @param {Array}	list
	 */
	set list(list) {
		if (typeof list !== "object" || !list.length)
			throw { code: -1, description: `Queue.list: not a valid array` }

		this.queueList = list;

		if (this.queuePos > list.length - 1)
			this.queuePos = list.length - 1;
	}

	addHandler(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `Queue.addHandler(): not a valid function` }

		let insPos = this.handlers.push({
			free: true,
			handler: f
		});

		this.assign();
		return insPos;
	}

	removeHandler(pos) {
		if (typeof pos !== "number" || !this.queueList[pos])
			throw { code: -1, description: `Queue.removeHandler(${pos}): not a valid number or hander does not exist` }

		this.handlers = this.handlers.splice(pos, 1);
	}

	start() {
		if (this.running)
			throw { code: -1, description: `Queue.start(): Queue is still running` }

		this.running = true;
		this.assign();
	}

	stop() {
		this.running = false;
		this.queuePos = 0;
		this.handlerPos = 0;
	}

	assign() {
		if (!this.running)
			return { code: 0, description: `Queue: Stopped` }

		let assigned = 0;

		for (let item of this.handlers)
			if (item.free && this.queuePos < this.queueList.length) {
				item.free = false;
				item.handler(this.queueList[this.queuePos++])
					.then(() => {
						item.free = true;
						this.assign();
					})
					.catch((error) => {
						clog("ERRR", `Queue.assign(): handler returned an error:`, error);
						item.free = true;
						this.assign();
					});

				assigned++;

				if (this.queuePos >= this.queueList.length - 1 && this.isLooping)
					this.queuePos = 0;
			}

		if (!this.isLooping && assigned === 0 && this.handlers.length > 0) {
			this.stop();
			this.completeHandlers.forEach(f => f());
		}
	}

	onComplete(f) {
		if (typeof f !== "function")
			throw { code: -1, description: `Queue.onComplete(): not a valid function` }

		this.completeHandlers.push(f);
	}
}

class ClassWatcher {
	constructor(targetNode, classToWatch, classAddedCallback, classRemovedCallback) {
		this.targetNode = targetNode;
		this.classToWatch = classToWatch;
		this.classAddedCallback = classAddedCallback;
		this.classRemovedCallback = classRemovedCallback;
		this.observer = null;
		this.lastClassState = targetNode.classList.contains(this.classToWatch);

		this.mutationCallback = mutationsList => {
			for (let mutation of mutationsList) {
				if (mutation.type === "attributes" && mutation.attributeName === "class") {
					let currentClassState = mutation.target.classList.contains(this.classToWatch);
					if (this.lastClassState !== currentClassState) {
						this.lastClassState = currentClassState;
						if (currentClassState)
							this.classAddedCallback();
						else
							this.classRemovedCallback();
					}
				}
			}
		}

		this.init();
	}

	init() {
		this.observer = new MutationObserver(this.mutationCallback);
		this.observe();
	}

	observe() {
		this.observer.observe(this.targetNode, { attributes: true });
	}

	disconnect() {
		this.observer.disconnect();
	}
}

function currentScript() {
	let url = (document.currentScript) ? document.currentScript.src : "unknown";
	return url.substring(url.lastIndexOf("/") + 1);
}

/**
 * Add padding to the left of input
 * 
 * Example:
 * 
 * + 21 with length 3: 021
 * + "sample" with length 8: "  sample"
 *
 * @param	{String|Number}		input	Input String
 * @param	{Number}			length	Length
 * @param	{Boolean}			right	Align right???
 */
function pleft(input, length = 0, right = false) {
	let type = typeof input;
	let padd = "";

	input = (type === "number") ? input.toString() : input;

	switch (type) {
		case "number":
			padd = "0";
			break;

		case "string":
			padd = " ";
			break;

		default:
			console.error(`error: pleft() first arg is ${type}`);
			return false;
	}

	padd = padd.repeat(Math.max(0, length - input.length));
	return (right) ? input + padd : padd + input;
}

/**
 * My color template
 * 
 * Return color in HEX string
 *
 * @param	{string}	color
 * @returns	{String}
 */
function flatc(color) {
	const clist = {
		green: "#A8CC8C",
		red: "#E88388",
		blue: "#71BEF2",
		aqua: "#66C2CD",
		yellow: "#DBAB79",
		orange: "#e67e22",
		gray: "#6B737E",
		magenta: "#D290E4",
		black: "#282D35",
		pink: "#f368e0",
	}

	return (clist[color]) ? clist[color] : clist.black;
}

/**
 * Color template from OSC package
 * 
 * Return color in HEX string
 *
 * @param	{string}	color
 * @returns	{String}
 */
function oscColor(color) {
	const clist = {
		whitesmoke:		"#f6f6f6",
		pink:			"#ff66aa",
		green:			"#49b104",
		blue:			"#44aadd",
		yellow:			"#f6c21c",
		orange:			"#ffa502",
		red:			"#dd2d44",
		brown:			"#3f313d",
		gray:			"#485e74",
		dark:			"#1E1E1E",
		purple:			"#593790",
		darkGreen:		"#0c4207",
		darkBlue:		"#032b3d",
		darkYellow:		"#444304",
		darkRed:		"#440505",
		lightBlue:		"#daf3ff",
		navyBlue:		"#333D79"
	}

	return (clist[color]) ? clist[color] : clist.dark;
}

/**
 * Scale value from range [a, b] to [c, d]
 * 
 * @param	{Number}		value		Value to scale
 * @param	{Number[]}		from		Contain 2 points of input value range. Ex: [0, 1]
 * @param	{Number[]}		to			Target scale range of input value. Ex: [50, 100]
 * @returns	{Number}		Scaled value
 */
function scaleValue(value, from, to) {
	let scale = (to[1] - to[0]) / (from[1] - from[0]);
	let capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
	return capped * scale + to[0];
}

/**
 * Triangle Background
 * 
 * Create alot of triangle in the background of element
 *
 * @param	{Element}			element					Target Element
 * @param	{Object}			options
 * @param	{Number}			options.speed			Triangle speed
 * @param	{String}			options.color			Triangle color
 * @param	{Number}			options.scale			How large the triangle is
 * @param	{Number}			options.triangleCount	How many triangles?
 * @param	{"fill"|"border"}	options.style			Triangle style
 */
function triBg(element, {
	speed = 34,
	color = "gray",
	scale = 2,
	triangleCount = 38,
	style = "fill"
} = {}) {
	return new TriangleBackground(element, {
		speed,
		color,
		size: 52 * scale,
		count: triangleCount,
		style,
		scale: [0.4, 3.0]
	});
}

class TriangleBackground {
	/**
	 * Create a lot of triangles in the background of element.
	 * 
	 * @param	{Element}			element					Target element
	 * @param	{Object}			options
	 * @param	{Number}			options.speed			Triangle speed.
	 * @param	{String}			options.color			Triangle color.
	 * @param	{Number}			options.size			How large the triangle is, in pixels.
	 * @param	{Number}			options.count			How many triangles?
	 * @param	{"fill"|"border"}	options.style			Triangle style.
	 * @param	{Number[]}			options.scale			Scale range.
	 * @param	{Boolean}			options.hoverable
	 */
	constructor(element, {
		speed = 12,
		color = "blue",
		size = 52,
		count = 38,
		style = "fill",
		scale = [0.4, 3.0],
		hoverable = true,
		bright = 15
	} = {}) {
		this.container = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		this.container.classList.add("triangleBackground");
		this.container.dataset.count = count;
		this.container.dataset.style = style;

		if (hoverable)
			this.container.setAttribute("hoverable", "");

		this.currentSpeed = speed;
		this.currentColor = color;
		this.size = size;
		this.currentCount = count;
		this.currentScale = scale;
		this.style = style;
		this.bright = bright;
		this.hoverable = hoverable;

		this.container.dataset.triColor = color;
		this.container.dataset.triStyle = style;

		/** @type {SVGPolygonElement[]} */
		this.triangles = [];

		if (typeof element === "object" && element.tagName) {
			let current = element.querySelector(":scope > .triangleBackground");

			if (current)
				element.removeChild(current);

			element.classList.add("triBg");
			element.insertBefore(this.container, element.firstChild);

			(new ResizeObserver(() => this.updateSize(true))).observe(element);
			this.updateSize();
		}

		this.generate();
	}

	updateSize(observed = false) {
		if (!this.container.parentElement)
			return;

		let width = this.container.parentElement.clientWidth;
		let height = this.container.parentElement.clientHeight;
		this.container.setAttributeNS("http://www.w3.org/2000/svg", "viewBox", `0 0 ${width} ${height}`);

		if (observed)
			this.updateTriangles();
	}

	async updateTriangles() {
		// Nice hack =))
		// This is to trigger update on triangles position in animation.

		this.container.style.display = "flex";
		await nextFrameAsync();
		this.container.style.display = "block";
	}

	set({ scale, speed, count, color } = {}) {
		let reGen = false;

		if (typeof scale === "number") {
			this.size = 52 * scale;
			reGen = true;
		}

		if (typeof speed === "number") {
			this.currentSpeed = speed;
			reGen = true;
		}

		if (typeof count === "number") {
			this.currentCount = count;
			reGen = true;
		}

		if (typeof color === "string") {
			this.currentColor = color;
			this.container.dataset.triColor = color;

			if (this.style === "border")
				reGen = true;
		}

		if (reGen)
			this.generate();
	}

	/**
	 * Set triangle's scale (size).
	 * 
	 * @param {Number} scale
	 */
	set scale(scale) {
		this.set({ scale });
	}

	/**
	 * Set triangle's color.
	 * 
	 * @param {String} color
	 */
	set color(color) {
		this.set({ color });
	}

	/**
	 * Set triangle's move speed.
	 * 
	 * @param {Number} speed
	 */
	set speed(speed) {
		this.set({ speed });
	}

	/**
	 * Set how many triangles will be generated.
	 * 
	 * @param {String} count
	 */
	set count(count) {
		this.set({ count });
	}

	generate(count) {
		if (typeof count === "number")
			this.currentCount = count;

		emptyNode(this.container);
		this.triangles = []
		const d = 0.8660254;

		for (let i = 0; i < this.currentCount; i++) {
			let scale = randBetween(this.currentScale[0], this.currentScale[1], false);
			let side = this.size * scale;
			let left = randBetween(-5, 90);
			let delay = randBetween(-this.currentSpeed / 2, this.currentSpeed / 2, false);

			let dh = side * d;
			let A = [(side / 2), 0];
			let B = [0, dh];
			let C = [side, dh];

			let triangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");

			triangle.style.setProperty("--left", `${left}%`);
			triangle.style.setProperty("--height", `${dh}px`);
			triangle.style.animationDelay = `${delay}s`;
			triangle.style.animationDuration = `${this.currentSpeed / scale}s`;

			if (this.style === "fill") {
				let bright = TriangleBackground.randomBright(this.currentColor);
				triangle.style.filter = `brightness(${bright})`;
			}
			
			for (let point of [A, B, C]) {
				let p = this.container.createSVGPoint();
				p.x = point[0];
				p.y = point[1];
				triangle.points.appendItem(p);
			}

			this.triangles.push(triangle);
			this.container.appendChild(triangle);
		}

		if (this.style === "border") {
			let id = randString(8);
			let color = oscColor(this.currentColor);
			let color2 = TriangleBackground.increaseBrightness(color, this.bright);
			this.container.style.setProperty("--background-up", color2);

			let defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
			defs.appendChild(this.createGradient(`trigrad1-${id}`, color, [1, 0.9, 0]));
			defs.appendChild(this.createGradient(`trigrad2-${id}`, color2, [1, 0.9, 0], 90));

			let rect1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
			rect1.style.fill = `url(#trigrad1-${id})`;
			rect1.classList.add("rect1");

			this.container.append(defs, rect1);

			if (this.hoverable) {
				let rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				rect2.style.fill = `url(#trigrad2-${id})`;
				rect2.classList.add("rect2");

				this.container.appendChild(rect2);
			}
		}
	}

	createGradient(id, color, opacity = [1, 1, 1], rotate = -90) {
		let gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
		gradient.id = id;

		let gradTransform = this.container.createSVGTransform();
		gradTransform.setRotate(rotate, 0.5, 0.5);
		gradient.gradientTransform.baseVal.appendItem(gradTransform);

		let gradFrom = document.createElementNS("http://www.w3.org/2000/svg", "stop");
		gradFrom.offset.baseVal = 0;
		gradFrom.style.stopColor = color;
		gradFrom.style.stopOpacity = opacity[0];

		let gradMid = document.createElementNS("http://www.w3.org/2000/svg", "stop");
		gradMid.offset.baseVal = 0.1;
		gradMid.style.stopColor = color;
		gradMid.style.stopOpacity = opacity[1];

		let gradTo = document.createElementNS("http://www.w3.org/2000/svg", "stop");
		gradTo.offset.baseVal = 1;
		gradTo.style.stopColor = color;
		gradTo.style.stopOpacity = opacity[2];

		gradient.append(gradFrom, gradMid, gradTo);
		return gradient;
	}

	static increaseBrightness(hex, percent) {
		// Strip the leading # if it's there.
		hex = hex.replace(/^\s*#|\s*$/g, '');
	
		// Convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
		if (hex.length === 3)
			hex = hex.replace(/(.)/g, "$1$1");
	
		let r = parseInt(hex.substr(0, 2), 16),
			g = parseInt(hex.substr(2, 2), 16),
			b = parseInt(hex.substr(4, 2), 16);
	
		return "#" +
			((0 | (1 << 8) + r + (256 - r) * percent / 100).toString(16)).substring(1) +
			((0 | (1 << 8) + g + (256 - g) * percent / 100).toString(16)).substring(1) +
			((0 | (1 << 8) + b + (256 - b) * percent / 100).toString(16)).substring(1);
	}

	static randomBright(color) {
		if (this.darkColors().includes(color))
			return randBetween(1.1, 1.3, false);

		if (this.lightColors().includes(color))
			return randBetween(0.96, 1.05, false);

		return randBetween(0.9, 1.2, false);
	}

	static darkColors() {
		return ["brown", "dark", "darkRed", "darkGreen", "darkBlue"];
	}

	static lightColors() {
		return ["lightBlue", "whitesmoke"];
	}
}

/**
 * Generate Random Number
 * @param	{Number}		min		Minimum Random Number
 * @param	{Number}		max		Maximum Random Number
 * @param	{Boolean}		toInt	Return an Integer Value
 * @returns	{Number}
 */
function randBetween(min, max, toInt = true) {
	return toInt
		? Math.floor(Math.random() * (max - min + 1) + min)
		: (Math.random() * (max - min) + min)
}

/**
 * Generate Random String
 * @param	{Number}	len		Length of the randomized string
 * @param	{String}	charSet
 * @returns	{String}
 */
function randString(len = 16, charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") {
	let randomString = "";

	for (let i = 0; i < len; i++) {
		let p = Math.floor(Math.random() * charSet.length);
		randomString += charSet.substring(p, p + 1);
	}

	return randomString;
}

/**
 * Pick a random item in an Array
 * @param {Array} array 
 */
function randItem(array) {
	if (typeof array.length !== "number")
		throw { code: -1, description: `randItem(): not a valid array` }

	return array[randBetween(0, array.length - 1, true)];
}

/**
 * Reduce an array of number by averaing it's value.
 * @param	{Number[]}		array
 * @param	{Number}		factor		Must be larger than 1.
 * @param	{Number[]}
 */
function reduceNumbersArray(array, factor) {
	if (typeof array !== "object" || !array || array.length === 0)
		return []

	if (factor === 1)
		return array;

	let newArray = []
	let nLen = Math.floor(array.length / factor);
	let step = nLen / array.length;
	let sum = 0, count = 0, lFac, rFac;

	for (let i = 0; i < nLen; i++) {
		let o = i * factor;
		sum = 0;
		count = 0;

		let left = o - (step * factor);
		let right = o + (step * factor);

		// Sum left and right
		if (left >= 0) {
			lFac = Math.ceil(left) - left;
			count += lFac;
			sum += array[Math.floor(left)] * lFac;
		}

		if (right <= (array.length - 1)) {
			rFac = right - Math.floor(right);
			count += rFac;
			sum += array[Math.floor(right)] * rFac;
		}

		// Sum all points in between
		for (let j = Math.max(Math.ceil(left), 0); j < Math.floor(right); j++) {
			count += 1;
			sum += array[j];
		}

		newArray.push(sum / count);
	}

	return newArray;
}

const Easing = {
	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	Linear: t => t,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InSine: t => 1 - Math.cos((t * Math.PI) / 2),

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	OutSine: t => Math.sin((t * Math.PI) / 2),

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InQuad: t => t*t,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	OutQuad: t => t*(2-t),

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InOutQuad: t => (t < .5) ? 2*t*t : -1+(4-2*t)*t,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InCubic: t => t*t*t,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	OutCubic: t => (--t)*t*t+1,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InOutCubic: t => (t < .5) ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InExpo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	OutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InOutExpo: t => t === 0
				? 0
				: t === 1
					? 1
					: t < 0.5
						? Math.pow(2, 20 * t - 10) / 2
						: (2 - Math.pow(2, -20 * t + 10)) / 2,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InQuart: t => t*t*t*t,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	OutQuart: t => 1-(--t)*t*t*t,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InOutQuart: t => (t < .5) ? 8*t*t*t*t : 1-8*(--t)*t*t*t,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InQuint: t => t*t*t*t*t,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	OutQuint: t => 1 - Math.pow(1 - t, 5),

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InOutQuint: t => (t < 0.5) ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	InElastic: t => {
		const c4 = (2 * Math.PI) / 3;
		
		return t === 0
			? 0
			: t === 1
				? 1
				: -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
	},

	/**
	 * @param	{Number}	t	Point [0, 1]
	 * @return	{Number}		Point [0, 1]
	 */
	OutElastic: t => {
		const c4 = (2 * Math.PI) / 3;

		return t === 0
			? 0
			: t === 1
				? 1
				: Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
	}
}

class Animator {
	/**
	 * Animate a value
	 *
	 * @param	{Number}		duration 			Animation Duration in Seconds
	 * @param	{Function}		timingFunction 		Animation Timing Function
	 * @param	{Function}		animate 			Function To Handle Animation
	 */
	constructor(duration, timingFunction, animate) {
		if (duration < 0) {
			clog("WARN", `Animator(): duration is a negative number! (${duration}s). This animation will be completed instantly.`);

			animate(1);
			return;
		}

		this.duration = duration * 1000;
		this.timingFunction = timingFunction;
		this.animate = animate;
		this.completed = false;
		this.cancelled = false;

		/** @type {Function[]} */
		this.completeHandlers = []

		this.start = performance.now();
		this.animationFrameID = requestAnimationFrame(() => this.update());
	}

	update() {
		if (this.completed || this.cancelled)
			return;

		let tPoint = (performance.now() - this.start) / this.duration;

		// Safe executing update function to prevent stopping
		// animation entirely
		try {
			if (this.animate(Math.min(this.timingFunction(tPoint), 1)) === false)
				// Stop Animator
				tPoint = 1.1;
		} catch (e) {
			let error = parseException(e);
			clog("WARN", `Animator().update(): [${error.code}] ${error.description}`);
		}

		if (tPoint <= 1)
			this.animationFrameID = requestAnimationFrame(() => this.update());
		else {
			this.animate(1);
			this.completed = true;

			for (let f of this.completeHandlers) {
				try {
					f(true);
				} catch(e) {
					clog("WARN", `Animator().update(): an error occured while handing complete handlers`, e);
					continue;
				}
			}
		}
	}

	cancel() {
		if (this.completed || this.cancelled)
			return;

		cancelAnimationFrame(this.animationFrameID);
		this.cancelled = true;

		for (let f of this.completeHandlers) {
			try {
				f(false);
			} catch(e) {
				clog("WARN", `Animator().cancel(): an error occured while handing complete handlers`, e);
				continue;
			}
		}
	}

	/**
	 * Wait for animation to complete.
	 * @returns {Promise<Boolean>} true if animation completed, false if cancelled
	 */
	complete() {
		return new Promise((resolve) => {
			if (this.completed)
				resolve(true);

			this.onComplete((completed) => resolve(completed));
		});
	}

	/**
	 * Animation complete handler
	 * @param	{(completed: Boolean) => any}	f
	 */
	onComplete(f) {
		if (!f || typeof f !== "function")
			throw { code: -1, description: "Animator().onComplete(): not a valid function" }

		this.completeHandlers.push(f);
	}
}

class LoadingOverlay {
	/**
	 * Construct a new loading overlay instance inside specified
	 * container.
	 * @param {HTMLElement}	[container] 
	 */
	constructor(container, {
		index
	} = {}) {
		this.container = document.createElement("div");
		this.container.classList.add("loadingOverlay");

		if (index)
			this.container.style.zIndex = index;

		this.spinner = document.createElement("div");
		this.spinner.classList.add("spinner");

		this.container.appendChild(this.spinner);
		if (container && container.classList)
			container.appendChild(this.container);

		this.isLoading = false;
		this.hideTimeout = undefined;
	}

	/**
	 * Set loading state
	 * @param	{Boolean}	loading
	 */
	set loading(loading) {
		this.setLoading(loading);
	}

	get loading() {
		return this.isLoading;
	}

	/**
	 * Set loading state
	 * @param	{Boolean}	loading
	 */
	async setLoading(loading) {
		if (this.isLoading === loading)
			return;

		this.isLoading = loading;

		clearTimeout(this.hideTimeout);
		if (loading) {
			this.container.classList.add("show");
			await nextFrameAsync();
			this.container.classList.add("loading");
		} else {
			this.container.classList.remove("loading");
			this.hideTimeout = setTimeout(() => {
				// Just to make sure when this is called before the wait for
				// next frame is complete.
				this.container.classList.remove("loading");
				this.container.classList.remove("show");
			}, 300);
		}
	}
}

if (typeof $ !== "function")
	/**
	 * A shorthand of querySelector
	 * @param	{String}	selector	Selector
	 * @returns	{HTMLElement}
	 */
	function $(query) {
		let r = document.querySelector(query);

		if (!r)
			clog("DEBG", `Could not find any element with query: ${query}`);

		return r;
	}

/**
 * Remove all childs in a Node
 * @param	{Element}	node	Node to empty
 */
function emptyNode(node) {
	while (node.firstChild)
		node.firstChild.remove();
}

/**
 * Insert a node after a node.
 * @param {HTMLElement} newNode
 * @param {HTMLElement} existingNode
 */
function insertAfter(newNode, existingNode) {
	existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

function sanitizeHTML(html) {
	let decoder = document.createElement("div");
	decoder.innerHTML = html;
	
	return decoder.textContent;
}

/**
 * @typedef { "text" | "textarea" | "email" | "password"
 * 		| "color" | "number" | "date" | "time" | "select"
 * 		| "file" | "datetime-local" | "month" | "week"
 * 		| "tel" | "url" } CreateInputTypes
 * 
 * @typedef {(value: String | Number) => any} CreateInputHandle
 */

/**
 * Create Input Element, require `input.css`
 * @param	{Object}							options
 * @param	{CreateInputTypes}					options.type
 * @param	{String}							options.id
 * @param	{String}							options.label
 * @param	{String}							options.value
 * @param	{"blue" | "purple" | "red"}			options.color
 * @param	{Boolean}							options.required
 * @param	{Boolean}							options.autofill
 * @param	{Boolean}							options.spellcheck
 * @param	{Object<string, any>}				options.options
 * @param	{Boolean}							options.animated
 * @param	{Boolean}							options.disabled
 */
function createInput({
	type = "text",
	id = randString(6),
	label = "Sample Input",
	value = "",
	color = "blue",
	required = false,
	autofill = true,
	spellcheck = false,
	options = {},
	animated = false,
	disabled = false
} = {}) {
	// Check valid input type can be used in this api. Will throw an error when input type is invalid
	// Some types are not included because there are api to create that specific input
	//
	// See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types
	if (!["text", "textarea", "email", "password", "color", "number", "date", "time", "select", "file", "datetime-local", "month", "week", "tel", "url"].includes(type))
		throw { code: -1, description: `createInput(${type}): Invalid type: ${type}` }

	let container = makeTree("span", "sq-input", {
		input: {
			tag: ["textarea", "select"].includes(type) ? type : "input",
			class: "input",
			type,
			id,
			placeholder: label,
			autocomplete: autofill ? "on" : "off",
			autofill: autofill ? "on" : "off",
			spellcheck: !!spellcheck,
			required
		},

		outline: { tag: "div", class: "outline", child: {
			leading: { tag: "span", class: ["notch", "leading"] },

			label: { tag: "span", class: ["notch", "label"], child: {
				label: { tag: "label", htmlFor: id, text: label }
			}},

			trailing: { tag: "span", class: ["notch", "trailing"] }
		}},

		message: { tag: "div", class: "message" }
	});

	container.dataset.color = color;
	container.dataset.soundhoversoft = "";
	container.dataset.soundselectsoft = "";

	if (animated)
		container.setAttribute("animated", true);

	if (typeof sounds === "object")
		sounds.applySound(container, ["soundhoversoft", "soundselectsoft"]);

	switch(type) {
		case "textarea":
			container.input.style.fontFamily = "Consolas";
			container.input.style.fontWeight = "bold";
			container.input.style.fontSize = "15px";
			break;

		case "select": {
			for (let key of Object.keys(options)) {
				let option = document.createElement("option");
				option.value = key;
				option.innerHTML = options[key];

				container.input.appendChild(option);
			}

			break;
		}
	}

	// Events
	let currentColor = color;
	let onInputHandlers = [];
	let onChangeHandlers = [];
	let validateHandlers = [];

	container.input.disabled = disabled;
	container.input.addEventListener("input", (e) => onInputHandlers.forEach(f => f(container.input.value, e)));
	container.input.addEventListener("change", (e) => onChangeHandlers.forEach(f => f(container.input.value, e)));
	container.input.value = value;

	// Event for validating input.
	container.input.addEventListener("input", () => {
		for (let handler of validateHandlers) {
			if (!handler()) {
				container.dataset.color = "red";
				break;
			}
		}

		container.classList.remove("message");
		container.dataset.color = currentColor;
	});

	return {
		group: container,

		/** @type {HTMLInputElement} */
		input: container.input,

		set({
			value,
			label,
			options,
			color,
			message
		}) {
			if (typeof options === "object" && container.input.tagName.toLowerCase() === "select") {
				emptyNode(container.input);

				for (let key of Object.keys(options)) {
					let option = document.createElement("option");
					option.value = key;
					option.innerHTML = options[key];

					container.input.appendChild(option);
				}
			}

			if (typeof value !== "undefined") {
				container.input.value = value;
				container.input.dispatchEvent(new Event("input"));
				container.input.dispatchEvent(new Event("change"));
			}

			if (label)
				container.input.innerText = label;

			if (typeof color === "string") {
				container.dataset.color = color;
				currentColor = color;
			}
			
			if (typeof message === "string") {
				container.classList.add("message");
				container.dataset.color = "red";
				container.message.innerText = message;
			} else if (message === false) {
				container.classList.remove("message");
			}
		},

		/** @return	{String} */
		get value() {
			return container.input.value;
		},

		set value(value) {
			this.set({ value });
		},

		/** @return	{Boolean} */
		get disabled() {
			return container.input.disabled;
		},

		set disabled(disabled) {
			container.input.disabled = disabled;
		},

		validate(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `createInput(${type}).onInput(): Not a valid function` }

			validateHandlers.push(f);
		},

		/**
		 * @param {function} f
		 */
		onInput(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `createInput(${type}).onInput(): Not a valid function` }

			onInputHandlers.push(f);
			f(container.input.value, null);
		},

		/**
		 * @param {function} f
		 */
		onChange(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `createInput(${type}).onChange(): Not a valid function` }

			onChangeHandlers.push(f);
			f(container.input.value, null);
		}
	}
}

/**
 * Create standard OSC input.
 * @param	{Object}				options
 * @param	{CreateInputTypes}		options.type
 * @param	{String}				options.label
 * @param	{String}				options.value
 * @param	{Boolean}				options.disabled
 * @param	{CreateInputHandle}		options.onInput
 * @param	{CreateInputHandle}		options.onEnter
 */
function createOscInput({
	type = "text",
	label = "label",
	value = "value",
	disabled = false,
	onInput = undefined,
	onEnter = undefined
}) {
	let container = makeTree("div", "osc-input", {
		label: { tag: "label", text: label },
		input: { tag: "input", type, value }
	});

	if (typeof disabled === "boolean")
		container.input.disabled = disabled;

	let onInputHandlers = []
	let onEnterHandlers = []

	if (typeof onInput === "function")
		onInputHandlers.push(onInput);

	if (typeof onEnter === "function")
		onEnterHandlers.push(onEnter);

	const getValue = () => {
		return (type === "number")
			? parseFloat(container.input.value)
			: container.input.value;
	}

	container.input.addEventListener("input", () => {
		for (let f of onInputHandlers) {
			try {
				f(getValue());
			} catch(e) {
				clog("WARN", `an error occured while handing onInput`, e);
				continue;
			}
		}
	});

	container.input.addEventListener("keydown", (e) => {
		if (e.key !== "Enter")
			return;

		for (let f of onEnterHandlers) {
			try {
				f(getValue());
			} catch(e) {
				clog("WARN", `an error occured while handing onEnter`, e);
				continue;
			}
		}
	});

	return {
		container,
		input: container.input,
		getValue,

		get value() {
			return getValue();
		},

		/**
		 * Set input's value
		 * @param	{String}	value
		 */
		set value(value) {
			container.input.value = value;
		},

		/**
		 * Listen for input event.
		 * @param {CreateInputHandle} f
		 */
		onInput(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `createOscInput().onInput(): not a valid function!` }
		
			return onInputHandlers.push(f) - 1;
		},

		/**
		 * Listen for event that will fire when enter key is
		 * presses while focusing in the input element.
		 * 
		 * @param {CreateInputHandle} f
		 */
		onEnter(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `createOscInput().onEnter(): not a valid function!` }
		
			return onEnterHandlers.push(f) - 1;
		},
	}
}

function createListInput({
	label = "Sample List Input",
	type = "text",
	addText = "Thêm Hàng Mới",
	values = []
}) {
	let container = document.createElement("div");
	container.classList.add("listInput");

	let labelNode = document.createElement("label");
	labelNode.innerText = label;

	let inputsNode = document.createElement("div");
	inputsNode.classList.add("inputs");
	
	let addButton = document.createElement("button");
	addButton.type = "button";
	addButton.classList.add("add");
	addButton.innerText = addText;

	container.append(labelNode, inputsNode, addButton);

	/** @type {HTMLInputElement[]} */
	let inputs = []

	const addInput = (value) => {
		let node = document.createElement("div");
		node.classList.add("input");

		let input;
		if (type === "textarea") {
			input = document.createElement(type);
		} else {
			input = document.createElement("input");
			input.type = type;
		}

		input.classList.add("input");
		input.value = value;

		let remove = document.createElement("icon");
		remove.dataset.icon = "minusCircle";

		node.append(input, remove);
		inputsNode.appendChild(node);
		let index = inputs.push(input) - 1;

		remove.addEventListener("click", () => {
			inputsNode.removeChild(node);
			inputs.splice(index, 1);
		});
	}

	const clearAll = () => {
		emptyNode(inputsNode);
		inputs = [];
	}

	const getValues = () => {
		return inputs
			.map(i => i.value)
			.filter(i => i.length > 0);
	}

	const set = ({ label, values } = {}) => {
		if (typeof label === "string")
			labelNode.innerText = label;

		if (typeof values === "object" && values !== null && values.length) {
			clearAll();

			for (let value of values)
				addInput(value);
		}
	}

	addButton.addEventListener("click", () => addInput(""));
	set({ values });

	return {
		group: container,
		set,
		clearAll,
		addInput,

		/** @return	{String[]} */
		get values() {
			return getValues();
		},

		set values(values) {
			set({ values });
		}
	}
}

/**
 * Create Checkbox Element, require switch.css
 * @author Belikhun
 */
function createCheckbox({
	label = "Sample Checkbox",
	color = "pink",
	value = false,
	type = "checkbox"
} = {}) {
	let container = document.createElement("div");
	container.classList.add("checkboxContainer");
	container.dataset.soundhoversoft = "";
	sounds.applySound(container);

	let title = document.createElement("span");
	title.innerHTML = label;

	let switchLabel = document.createElement("label");
	switchLabel.classList.add("sq-checkbox");
	switchLabel.dataset.color = color;

	let input = document.createElement("input");
	input.type = type;
	input.checked = value;
	input.dataset.soundcheck = "";

	if (typeof sounds === "object")
		sounds.applySound(input);

	let mark = document.createElement("span");
	mark.classList.add("checkmark");

	switchLabel.appendChild(input);
	switchLabel.appendChild(mark);
	container.appendChild(title);
	container.appendChild(switchLabel);

	return {
		group: container,
		input,
		title,
		label: switchLabel
	}
}

/**
 * @typedef {{
 * 	group: HTMLDivElement
 * 	input: HTMLInputElement
 * 	title: HTMLElement
 * 	label: HTMLElement
 * 	value: Boolean
 * 	disabled: Boolean
 * }} SQSwitch
 * 
 * Create Switch Element, require switch.css
 * 
 * @param	{Object}			options
 * @param	{String}			options.label
 * @param	{Boolean}			options.value
 * @param	{"pink" | "blue"}	options.color
 * @param	{String}			options.type
 * @param	{String}			options.id
 * @param	{Boolean}			options.disabled
 * @return	{SQSwitch}
 * @author	Belikhun
 */
function createSwitch({
	label = "Sample Switch",
	value = false,
	color = "blue",
	type = "checkbox",
	id = `switch_${randString(8)}`,
	disabled = false
} = {}) {
	let container = document.createElement("div");
	container.classList.add("checkboxContainer");
	sounds.applySound(container, ["soundhoversoft"]);

	let title = document.createElement("span");
	title.innerHTML = label;

	let switchLabel = document.createElement("div");
	switchLabel.classList.add("sq-switch");
	switchLabel.dataset.color = color;

	let input = document.createElement("input");
	input.classList.add("checkbox");
	input.id = id;
	input.type = type;
	input.checked = value;
	input.disabled = disabled;

	if (typeof sounds === "object")
		sounds.applySound(input, ["soundcheck"]);

	let track = document.createElement("label");
	track.classList.add("track");
	track.htmlFor = id;

	switchLabel.appendChild(input);
	switchLabel.appendChild(track);
	container.appendChild(title);
	container.appendChild(switchLabel);

	return {
		group: container,
		input,
		title,
		label: switchLabel,

		/**
		 * Update switch value
		 * @param {Boolean} value
		 */
		set value(value) {
			input.checked = value;
		},

		get value() {
			return input.checked;
		},

		/**
		 * Update switch disabled state
		 * @param {Boolean} disabled
		 */
		set disabled(disabled) {
			input.disabled = disabled;
		},

		get disabled() {
			return input.disabled;
		}
	}
}

/**
 * @typedef {{
 * 	icon: String
 * 	color: "blue"|"pink"
 * 	fixed: Boolean
 * 	options: { [x: String]: String }
 * 	value: String
 * 	onChange: (f: (value: String) => void) => void
 * }} SelectInputOptions
 * 
 * @typedef {{
 * 	group: HTMLElement
 * 	showing: Boolean
 * 	show: () => void
 * 	hide: (isSelected: Boolean = false) => void
 * 	set: (options: SelectInputOptions) => void
 * 	add: (key: String, value: String) => void
 * 	value: String
 * 	onChange: (f: (value: String) => void) => void
 * }} SelectInputInstance
 */

/**
 * Create a new select input.
 * 
 * @param	{SelectInputOptions}		options
 * @returns {SelectInputInstance}
 */
function createSelectInput({
	icon,
	color = "blue",
	fixed = false,
	options = {},
	value,
	onChange = null
} = {}) {
	let container = makeTree("div", "sq-selector", {
		current: { tag: "div", class: "current", child: {
			icon: { tag: "icon", class: "icon" },
			value: { tag: "t", class: "value" },
			arrow: { tag: "icon", class: "arrow", data: { icon: "arrowDown" } }
		}},

		select: { tag: "div", class: "select", child: {
			list: { tag: "div", class: "list" }
		}}
	});

	container.current.icon.style.display = "none";

	if (typeof sounds === "object")
		sounds.applySound(container.current, ["soundhover"]);

	if (typeof Scrollable === "function")
		new Scrollable(container.select, {
			content: container.select.list
		});

	/** @type {HTMLDivElement} */
	let activeNode = undefined;
	let activeValue = undefined;
	let currentOptions = {}
	let changeHandlers = []
	let showing = false;

	if (typeof onChange === "function")
		changeHandlers.push(onChange);

	const show = () => {
		if (typeof sounds === "object")
			sounds.select(1);

		showing = true;
		container.classList.add("show");
		container.select.style.height = `${Math.min(150, container.select.list.scrollHeight)}px`;
	}

	const hide = (isSelected = false) => {
		if (typeof sounds === "object" && !isSelected)
			sounds.select(1);
		
		showing = false;
		container.classList.remove("show");
		container.select.style.height = null;
	}

	const toggle = () => {
		if (showing)
			hide();
		else
			show();
	}

	const add = (key, value) => {
		let item = document.createElement("div");
		item.classList.add("item");
		item.dataset.value = key;
		item.innerText = value;
		currentOptions[key] = item;

		if (typeof sounds === "object")
			sounds.applySound(item, ["soundhoversoft"]);

		item.addEventListener("click", () => {
			if (activeNode)
				activeNode.classList.remove("active");
			
			activeNode = item;
			activeValue = item.dataset.value;
			item.classList.add("active");
			container.current.value.innerText = item.innerText;
			changeHandlers.forEach(f => f(item.dataset.value));

			if (typeof sounds === "object")
				sounds.soundToggle(sounds.sounds.valueChange);

			hide(true);
		});

		container.select.list.appendChild(item);
	}

	const set = ({
		icon,
		color,
		options,
		fixed,
		value
	} = {}) => {
		if (typeof color === "string")
			container.dataset.color = color;

		if (typeof icon === "string") {
			container.current.icon.style.display = null;
			container.current.icon.dataset.icon = icon;
		} else if (typeof icon !== "undefined")
			container.current.icon.style.display = "none";

		if (typeof options === "object") {
			emptyNode(container.select.list);
			activeNode = undefined;
			activeValue = undefined;
			currentOptions = {}

			for (let key of Object.keys(options))
				add(key, options[key]);
		}

		if (typeof fixed === "boolean") {
			container.classList[fixed ? "add" : "remove"]("fixed");
		}

		if (typeof value === "string" && currentOptions[value]) {
			if (activeNode)
				activeNode.classList.remove("active");

			activeNode = currentOptions[value];
			activeNode.classList.add("active");
			activeValue = value;
			container.current.value.innerText = activeNode.innerText;
			changeHandlers.forEach(f => f(activeValue));
		}
	}

	set({ icon, color, options, fixed, value });

	container.current.addEventListener("click", () => toggle());

	return {
		group: container,
		showing,
		show,
		hide,
		set,
		add,

		/**
		 * Get active value
		 * @return {String}
		 */
		get value() {
			return activeValue;
		},

		/**
		 * Set active value
		 * @param {String} value
		 */
		set value(value) {
			set({ value });
		},

		onChange: (f) => {
			if (typeof f !== "function")
				throw { code: -1, description: `createSelectInput().onChange(): not a valid function` }

			changeHandlers.push(f);

			if (activeValue)
				f(activeValue);
		}
	}
}

/**
 * @typedef {{
 *	group: HTMLElement
 *  update: (trusted: Boolean) => void
 * 	value: String|Object|String[]|Object[]|null
 *  disabled: Boolean
 *  loading: Boolean
 * 	message: String
 *  onInput: (f: (value: any, { trusted: bool }) => void) => void
 * }} AutocompleteInputInstance
 *
 * @typedef {(search) => Promise<object[]>} AutocompleteInputFetch
 * @typedef {(item) => { value, label: String|HTMLElement, badge: ?HTMLElement }} AutocompleteInputProcess
 */

/**
 * Create autocomplete input that support server-side searching.
 *
 * @param	{Object}								options
 * @param	{String}								options.id
 * @param	{String}								options.label
 * @param	{String}								options.color
 * @param	{Boolean}								options.required
 * @param	{Boolean}								options.multiple
 * @param	{Boolean}								options.animated
 * @param	{Boolean}								options.fixed
 * @param	{AutocompleteInputFetch}				options.fetch
 * @param	{AutocompleteInputProcess}				options.process
 * @param	{(value, { trusted: bool }) => void}	options.onInput
 * @return	{AutocompleteInputInstance}
 */
function createAutocompleteInput({
	id,
	label,
	color = "blue",
	required = false,
	multiple = false,
	animated = false,
	fixed = true,
	fetch = () => [],
	process = (i) => i,
	onInput = null
} = {}) {
	let input = createInput({
		type: "text",
		id,
		label,
		color,
		autofill: false,
		animated,
		required
	});

	input.group.classList.add("sq-autocomplete");
	let selects = document.createElement("span");
	selects.classList.add("selects");
	input.group.insertBefore(selects, input.group.firstChild);

	let spinner = document.createElement("div");
	spinner.classList.add("simpleSpinner");

	let panel = document.createElement("div");
	panel.classList.add("select-panel");

	let inner = document.createElement("div");
	inner.classList.add("inner");
	panel.appendChild(inner);

	if (!fixed) {
		input.group.classList.add("dynamic");

		(new ResizeObserver(() => {
			input.group.style.setProperty("--bottom-space", `calc(0.5rem + ${panel.clientHeight}px)`);
		})).observe(panel);
	}

	new Scrollable(panel, {
		content: inner,
		scrollout: false
	});

	const empty = makeTree("div", "message", {
		icon: { tag: "icon", icon: "search" },
		label: { tag: "label", text: `No result found` },
		sub: { tag: "div", text: `No result found matching with your input.` }
	});

	const error = makeTree("div", "message", {
		icon: { tag: "icon", icon: "exclamation" },
		label: { tag: "label", text: "Unknown Error" },
		sub: { tag: "div", text: "An unknown error occured! Please try again later." }
	});

	inner.appendChild(empty);

	let timeout = null;
	let fetched = {};
	let activates = [];
	let badges = [];
	let showing = false;
	let inputListeners = [];
	let isDisabled = false;

	if (typeof onInput === "function")
		inputListeners.push(onInput);

	document.body.addEventListener("click", (e) => {
		if (input.group.contains(e.target) || badges.includes(e.target))
			return;

		hideSelectPanel();
	});

	input.input.addEventListener("focus", async () => {
		if (showing || isDisabled)
			return;

		input.group.appendChild(panel);

		await nextFrameAsync();

		if (!fixed)
			input.group.style.setProperty("--bottom-space", `12.5rem`);

		panel.classList.add("display");
		showing = true;
		await search(input.value);
	});

	input.input.addEventListener("keydown", async () => {
		clearTimeout(timeout);
		timeout = setTimeout(() => search(input.value), 500);
	});

	const update = (trusted = false) => {
		let inputted = activates.length > 0;
		input.group.classList[inputted ? "add" : "remove"]("inputting");

		if (required)
			input.input.required = !inputted;

		inputListeners.forEach((f) => f(instance.value, { trusted }));
	};

	const hideSelectPanel = () => {
		if (!showing)
			return;

		if (!fixed)
			input.group.style.setProperty("--bottom-space", `0`);

		showing = false;
		panel.classList.remove("display");
		input.group.removeChild(panel);
		input.value = "";
	}

	const deactivateAll = (trusted = false, triggerUpdate = true) => {
		let i = activates.length;

		while (i--)
			activates[i].deactivate(trusted, false);

		activates = [];

		if (triggerUpdate) {
			update(trusted);
		} else {
			input.group.classList.remove("inputting");

			if (required)
				input.input.required = true;
		}
	};

	const search = async (search) => {
		input.group.appendChild(spinner);
		input.value = search;

		try {
			let items = await fetch(search);
			items = items.map((i) => ({ instance: i, ...process(i) }));

			if (inner.contains(error))
				inner.removeChild(error);

			setItems(items);
		} catch (e) {
			clog("WARN", `createAutocompleteInput() [search()]: handing fetch resulted in an error:`, e);

			const { code, description } = parseException(e);
			error.label.innerText = code;
			error.sub.innerHTML = description;

			inner.appendChild(error);

			if (inner.contains(empty))
				inner.removeChild(empty);
		}

		if (input.group.contains(spinner))
			input.group.removeChild(spinner);
	}

	const setItems = (items, selected = false) => {
		emptyNode(inner);

		if (!items || items.length === 0) {
			if (!selected) {
				inner.appendChild(empty);
			} else {
				update();
			}

			return;
		}

		let updateAfter = false;

		for (let item of items) {
			if (fetched[item.value]) {
				fetched[item.value].label(item.label);
				inner.appendChild(fetched[item.value].node);

				if (selected) {
					if (multiple) {
						fetched[item.value].activate(false, false);
						updateAfter = true;
					} else {
						fetched[item.value].activate();
					}
				}

				continue;
			}

			let node = document.createElement("div");
			node.classList.add("item");
			node.dataset.value = item.value;

			let badge = document.createElement("span");
			badge.classList.add("badge");
			badges.push(badge);

			const label = (label, badgeView = null) => {
				item.label = label;

				if (isElement(label)) {
					emptyNode(node);
					emptyNode(badge);
					badge.classList.add("node");

					node.appendChild(label);
					badge.appendChild(badgeView ? badgeView : label.cloneNode(true));
				} else {
					badge.classList.remove("node");
					node.innerHTML = label;
					badge.innerHTML = label;
				}
			};

			label(item.label, item.badge);
			let activated = false;

			const activate = (trusted = false, triggerUpdate = true) => {
				if (!multiple)
					deactivateAll(trusted, false);

				activates.push(instance);
				node.classList.add("selected");
				selects.appendChild(badge);
				activated = true;

				if (triggerUpdate)
					update(trusted);
			};

			const deactivate = (trusted = false, triggerUpdate = true) => {
				let index = activates.indexOf(instance);

				if (index >= 0)
					activates.splice(index, 1);

				node.classList.remove("selected");
				selects.removeChild(badge);
				activated = false;

				if (triggerUpdate)
					update(trusted);
			};

			node.addEventListener("click", () => {
				if (activated) {
					deactivate(true);
					return;
				}

				activate(true);

				if (!multiple && showing)
					hideSelectPanel();
			});

			badge.addEventListener("click", () => {
				if (isDisabled)
					return;

				deactivate(true);
			});

			let instance = { item, node, badge, label, activate, deactivate };
			fetched[item.value] = instance;
			inner.appendChild(node);

			if (selected) {
				if (multiple) {
					activate(false, false);
					updateAfter = true;
				} else {
					activate();
				}
			}
		}

		if (updateAfter)
			update();
	}

	const instance = {
		group: input.group,
		update,

		/**
		 * Get values
		 *
		 * @returns {String|Object|null}
		 */
		get value() {
			if (multiple) {
				return activates.map((instance) => {
					return (instance.item.instance)
						? instance.item.instance
						: instance.item.value;
				});
			}

			if (activates[0]) {
				return (activates[0].item.instance)
					? activates[0].item.instance
					: activates[0].item.value;
			}

			return null;
		},

		set value(value) {
			if (value === null) {
				deactivateAll();
				return;
			}

			if (multiple) {
				if (!Array.isArray(value))
					value = [value];

				value = value.map((i) => {
					return { instance: i, ...process(i) };
				});

				deactivateAll(false, false);
				setItems(value, true);
				return;
			}

			if (Array.isArray(value))
				value = value[0];

			value = { instance: value, ...process(value) };
			setItems([value], true);
		},

		get disabled() {
			return input.input.disabled;
		},

		set disabled(disabled) {
			input.input.disabled = disabled;
			input.input.classList.toggle("disabled", disabled);
			isDisabled = disabled;
		},

		set loading(loading) {
			if (loading)
				input.group.appendChild(spinner);
			else {
				if (input.group.contains(spinner))
					input.group.removeChild(spinner);
			}
		},

		set message(message) {
			input.set({ message });
		},

		/**
		 * Listen for on input event.
		 *
		 * @param   {(value, { trusted: bool }) => void}    f
		 */
		onInput(f) {
			inputListeners.push(f);
		}
	}

   return instance;
}

/**
 * @typedef {{
 * 	[x: String]: {
 * 		icon: String
 * 		title: String
 * 	}
 * }} ChoiceInputChoices
 * 
 * Create choice input with icons
 * @param	{Object}				options
 * @param	{"blue" | "pink"}		options.color
 * @param	{ChoiceInputChoices}	options.choices
 * @param	{String}				options.value
 * @param	{String | String[]}		options.classes
 */
function createChoiceInput({
	color,
	choices,
	value,
	classes
} = {}) {
	let container = document.createElement("div");
	container.classList.add("sq-choice");

	switch (typeof classes) {
		case "string":
			container.classList.add(classes);
			break;
		
		case "object":
			if (classes.length && classes.length > 0)
				container.classList.add(...classes);
			else
				throw { code: -1, description: `createChoiceInput(): Invalid or empty "classes" type: ${typeof classes}` }

			break;
	}

	let choiceNodes = {}
	let choiceNames = {}
	let activeNode = null;
	let activeValue = null;
	let changeHandlers = []

	const setValue = (value) => {
		if (value === activeValue)
			return;

		if (!choiceNodes[value])
			return;

		if (activeNode)
			activeNode.classList.remove("active");

		choiceNodes[value].classList.add("active");
		activeValue = value;
		activeNode = choiceNodes[value];
		changeHandlers.forEach(f => f(value));
	}

	const add = ({ key, icon, title }) => {
		let node = document.createElement("icon");
		node.dataset.icon = icon || "circle";
		
		if (typeof title === "string") {
			node.title = title;
			choiceNames[key] = title;
		}

		container.appendChild(node);
		choiceNodes[key] = node;
		node.addEventListener("click", () => setValue(key));

		if (typeof sounds === "object")
			sounds.applySound(node, ["soundhover", "soundselect"]);
	}

	/**
	 * Update input options
	 * @param	{Object}				options
	 * @param	{"blue" | "pink"}		options.color
	 * @param	{ChoiceInputChoices}	options.choices
	 * @param	{String}				options.value
	 */
	const set = ({
		color,
		choices,
		value
	} = {}) => {
		if (typeof color === "string")
			container.dataset.color = color;

		if (typeof choices === "object") {
			choiceNodes = {}
			choiceNames = {}
			activeNode = null;
			activeValue = null;
			emptyNode(container);

			for (let key of Object.keys(choices))
				add({ key, icon: choices[key].icon, title: choices[key].title });
		}

		if (typeof value !== "undefined")
			setValue(value);
	}

	set({ color, choices, value });

	return {
		container,
		group: container,
		add,
		set,

		/**
		 * Set value
		 * @param	{String}	value
		 */
		set value(value) {
			set({ value });
		},

		/**
		 * Get value
		 * @return	{String}
		 */
		get value() {
			return activeValue;
		},

		/**
		 * All choice nodes
		 * @return	{Object<string, HTMLElement>}
		 */
		get choices() {
			return choiceNodes;
		},

		get names() {
			return choiceNames;
		},

		onChange(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `createChoiceInput().onChange(): not a valid function` }

			changeHandlers.push(f);
		}
	}
}

/**
 * Create a new slider component
 * 
 * @param {{
 * 	color: "pink" | "blue"
 * 	value: Number
 * 	min: Number
 * 	max: Number
 * 	step: Number
 * 	disabled: Boolean
 * }} options
 */
function createSlider({
	color = "pink",
	value = 0,
	min = 0,
	max = 10,
	step = 1,
	disabled = false
} = {}) {
	let container = makeTree("div", "osc-slider", {
		input: { tag: "input", type: "range" },
		left: { tag: "span", class: "leftTrack" },
		thumb: { tag: "span", class: "thumb" },
		right: { tag: "span", class: "rightTrack" }
	});

	let o = container;
	o.dataset.color = color;
	o.dataset.soundhover = true;

	if (typeof sounds === "object")
		sounds.applySound(o);

	o.input.min = min;
	o.input.max = max;
	o.input.step = step;
	o.input.value = value;
	o.input.disabled = disabled;

	const update = (e) => {
		let valP = (e.target.value - min) / (max - min);

		o.thumb.style.left = `calc(20px + (100% - 40px) * ${valP})`;
		o.left.style.width = `calc((100% - 40px) * ${valP})`;
		o.right.style.width = `calc(100% - (100% - 40px) * ${valP} - 40px)`;

		if (e.isTrusted && typeof sounds === "object")
			if (valP === 0)
				sounds.slider(2);
			else if (valP === 1)
				sounds.slider(1);
			else
				sounds.slider(0);
	}

	requestAnimationFrame(() => update({ target: o.input }));

	let inputHandlers = []
	let changeHandlers = []

	// Event train
	o.input.addEventListener("input", (e) => {
		let value = parseFloat(e.target.value);

		for (let handler of inputHandlers)
			handler(value, e);

		update(e);
	});

	o.input.addEventListener("change", (e) => {
		let value = parseFloat(e.target.value);

		for (let handler of changeHandlers)
			handler(value, e);
	});

	let mouseDown = false;
	let dragging = true;

	const resetDrag = () => {
		mouseDown = false;
		dragging = false;
		o.classList.remove("dragging");
	}

	o.input.addEventListener("mousedown", () => mouseDown = true);
	o.input.addEventListener("mouseup", () => resetDrag());
	o.input.addEventListener("mouseout", () => resetDrag());
	o.input.addEventListener("mousemove", () => {
		if (mouseDown && !dragging) {
			dragging = true;
			o.classList.add("dragging");
		}
	});

	return {
		group: container,
		input: o.input,

		/**
		 * Set slider's value
		 * @param {Number} value
		 */
		set value(value) {
			o.input.value = value;
			o.input.dispatchEvent(new Event("input"));
		},

		get value() {
			return parseFloat(o.input.value);
		},

		setValue(value) {
			this.value = value;
		},

		onInput(f) {
			if (!f || typeof f !== "function")
				throw { code: -1, description: "createSlider().onInput(): not a valid function" }

			inputHandlers.push(f);
			f(parseFloat(o.input.value));
		},

		onChange(f) {
			if (!f || typeof f !== "function")
				throw { code: -1, description: "createSlider().onChange(): not a valid function" }

			changeHandlers.push(f);
			f(parseFloat(o.input.value));
		}
	}
}

/**
 * @typedef {{
 * 	changeText(text: string)
 * 	loading: boolean
 * 	background?: triBg.prototype
 * } & HTMLButtonElement} SQButton
 */

/**
 * Create Button Element, require button.css
 *
 * @param	{String|HTMLElement}	text					Button Label
 * @param	{Object}				options					Button Options
 * @param	{String}				options.color
 * @param	{MakeTreeHTMLTags}		options.element			HTML Element
 * @param	{String}				options.type			HTML Button Type
 * @param	{"default" | "round"}	options.style
 * @param	{String | String[]}		[options.classes]
 * @param	{String}				[options.icon]
 * @param	{"left" | "right"}		[options.align]
 * @param	{Boolean}				[options.complex]
 * @param	{?Number}				[options.holdToConfirm]
 * @param	{() => any}				[options.onClick]
 * @param	{() => any}				[options.onConfirm]
 * @param	{Number}				[options.triangleCount]
 * @param	{"fill" | "border"}		[options.triangleStyle]
 * @param	{Boolean}				[options.disabled]
 * @returns	{SQButton}										Button Element
 */
function createButton(text, {
	color = "accent",
	element = "button",
	type = "button",
	style = "round",
	classes,
	icon = null,
	align = "left",
	complex = true,
	holdToConfirm = null,
	onClick = undefined,
	onConfirm = undefined,
	triangleCount = 16,
	triangleStyle = "border",
	disabled = false
} = {}) {
	let button = document.createElement(element);
	button.type = type;
	button.dataset.style = style;
	button.dataset.color = color;
	button.disabled = disabled;
	button.classList.add("sq-btn");

	switch (typeof classes) {
		case "string":
			button.classList.add(classes);
			break;

		case "object":
			if (classes.length && classes.length >= 0)
				button.classList.add(...classes);
			else
				throw { code: -1, description: `createButton(): Invalid or empty "classes" type: ${typeof classes}` }

			break;
	}

	if (icon)
		button.innerHTML = `<icon class="${align}" data-icon="${icon}"></icon>`;

	let textNode = document.createElement("span");
	textNode.classList.add("text");
	button.changeText = (text) => textNode.innerText = text;

	if (typeof text === "undefined" || text === null || text === "icon" || text === "") {
		button.classList.add("empty");
	} else {
		if (typeof text === "object" && text.tagName)
			textNode.appendChild(text);
		else
			textNode.innerText = text;

		if (align === "left")
			button.appendChild(textNode);
		else
			button.insertBefore(textNode, button.firstChild);
	}

	let spinner = document.createElement("div");
	spinner.classList.add("simpleSpinner");
	button.appendChild(spinner);

	Object.defineProperty(button, "loading", {
		set (loading) {
			if (loading) {
				button.disabled = true;
				button.dataset.loading = true;
			} else {
				button.disabled = false;
				button.removeAttribute("data-loading");
			}
		},

		get () {
			return (!!button.getAttribute("data-loading"));
		}
	});

	if (complex && style !== "flat") {
		button.background = triBg(button, {
			scale: 1.6,
			speed: 16,
			color: color,
			triangleCount: (triangleStyle === "border")
				? triangleCount / 2
				: triangleCount,
			style: triangleStyle,
			hoverable: true
		});
	}

	if (typeof holdToConfirm === "number") {
		let confirmRipple = document.createElement("div");
		confirmRipple.classList.add("confirmRipple");
		button.appendChild(confirmRipple);
		button.classList.add("holdConfirm");

		let progress = 0;
		let confirmed = false;
		let resetTimeout = null;
		let resetting = false;

		/** @type {Animator} */
		let animator = null;

		const reset = () => {
			progress = 0;
			confirmRipple.style.width = `0`;
			confirmed = false;

			if (animator) {
				animator.cancel();
				animator = null;
			}
		}

		const down = () => {
			if (confirmed)
				return;

			if (animator) {
				animator.cancel();
				animator = null;
			}

			clearTimeout(resetTimeout);
			resetting = false;

			let dur = holdToConfirm * (1 - progress);
			let start = progress;
			let amount = (1 - start);

			animator = new Animator(dur, Easing.Linear, (t) => {
				progress = start + amount * t;
				confirmRipple.style.width = `${progress * 100}%`;
			});

			animator.onComplete(async (completed) => {
				if (!completed)
					return;

				confirmed = true;
				button.loading = true;
				confirmRipple.style.width = `0`;

				if (typeof onConfirm === "function") {
					await onConfirm();
					button.loading = false;
					reset();
				}
			});
		}

		const up = () => {
			if (confirmed || resetting)
				return;

			if (animator) {
				animator.cancel();
				animator = null;
			}

			clearTimeout(resetTimeout);
			resetting = true;

			resetTimeout = setTimeout(() => {
				let dur = (holdToConfirm * 0.6) * progress;
				let start = progress;

				if (dur === 0)
					return;

				animator = new Animator(dur, Easing.InQuart, (t) => {
					progress = start * (1 - t);
					confirmRipple.style.width = `${progress * 100}%`;
				});
			}, Math.max(500, (holdToConfirm / 2) * 1000));
		}

		button.addEventListener("mousedown", () => down());
		button.addEventListener("mouseup", () => up());
		button.addEventListener("mouseleave", () => up());
	}

	if (typeof sounds === "object")
		sounds.applySound(button, ["soundhover", "soundselect"]);

	if (typeof onClick === "function") {
		button.addEventListener("click", async () => {
			button.loading = true;
			await onClick();
			button.loading = false;
		});
	}

	return button;
}

function createImageInput({
	id = randString(6),
	resetText = "Đặt Lại",
	accept = "image/*",
	src = "//:0"
} = {}) {
	if (!src)
		src = "//:0";

	let container = makeTree("div", "imageInput", {
		input: { tag: "input", type: "file", id, accept },
		image: { tag: "label", htmlFor: id, title: "Chọn Ảnh" },

		clear: { tag: "icon", class: "clear", title: "Loại Bỏ Ảnh", data: { icon: "close" } },
		reset: createButton(resetText, { color: "pink", complex: true })
	});

	let resetHandlers = []
	let image = new lazyload({
		container: container.image,
		source: src,
		classes: ["imageBox", item.display || "square"]
	});

	container.input.addEventListener("change", (e) => {
		let file = e.target.files[0];

		if (file) {
			image.src = URL.createObjectURL(file);
			container.clear.classList.add("show");
		} else {
			image.src = src;
			container.clear.classList.remove("show");
		}
	});

	container.clear.addEventListener("click", () => {
		container.clear.classList.remove("show");
		container.input.value = null;
		image.src = src;
	});

	container.reset.addEventListener("click", async (e) => {
		container.reset.loading(true);

		try {
			for (let f of resetHandlers)
				await f(e);
		} catch(e) {
			// Do nothing.
			clog("ERRR", `createImageInput(${id}): reset image failed with error`, e);
		}

		container.reset.loading(false);
	});

	container.input.dispatchEvent(new Event("change"));

	return {
		group: container,
		input: container.input,
		image,

		src(src = "//:0") {
			if (!src)
				src = "//:0";

			image.src = src;
			container.reset.disabled = (src === "//:0");
		},

		clear() {
			container.clear.classList.remove("show");
			container.input.value = null;
			image.src = src;
		},

		onReset(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `createImageInput().onReset(): not a valid function` }

			resetHandlers.push(f);
		}
	}
}

/**
 * Note Instance
 * 
 * @typedef {{
 * 	group: HTMLElement
 * 	set(options: CreateNoteOptions)
 * }} NoteInstance
 * 
 * @typedef {{
 * 	level: "okay" | "info" | "warning" | "error"
 * 	message: String
 * 	style: "flat" | "round"
 * }} CreateNoteOptions
 */

/**
 * Create new note.
 * 
 * @param		{CreateNoteOptions}		options
 * @returns		{NoteInstance}
 */
function createNote({
	level = "info",
	message = "Smaple Note",
	style = "flat"
} = {}) {
	let container = document.createElement("div");
	container.classList.add("note");
	container.dataset.level = level;
	container.dataset.style = style;

	let inner = document.createElement("span");
	inner.classList.add("inner");
	inner.innerHTML = message;

	container.appendChild(inner);

	return {
		group: container,

		set({ level, message, style } = {}) {
			if (typeof level === "string")
				container.dataset.level = level;

			if (typeof message !== "undefined")
				if (typeof message === "object" && message.classList) {
					emptyNode(this.inner);
					inner.appendChild(message);
				} else
					inner.innerHTML = message;

			if (typeof style === "string")
				container.dataset.style = style;
		}
	}
}

/**
 * Create Timer Element
 * 
 * @param	{Number|Object}	time	Time in seconds or object from parseTime()
 */
function createTimer(time = 0, {
	style = "normal"
} = {}) {
	let timer = document.createElement("timer");
	timer.dataset.style = style;

	let days = document.createElement("days");
	let inner = document.createElement("span");
	let ms = document.createElement("ms");

	timer.append(days, inner, ms);

	const set = ({
		time,
		style
	}) => {
		if (typeof time === "number")
			time = parseTime(time);

		if (typeof time === "object") {
			days.innerText = (time.days != 0) ? `${time.d}${time.days}` : "";
			inner.innerText = time.str;
			ms.innerText = time.ms;
		}

		if (typeof style === "string")
			timer.dataset.style = style;
	}

	set({ time, style });

	return {
		group: timer,
		set,

		toggleMs: (show) => {
			ms.style.display = (show) ? null : "none";
		}
	}
}

/**
 * @typedef {{
 * 	transition: Boolean
 *  indeterminate: Boolean
 * 	warningZone: Number
 * 	blink: "grow" | "fade" | "none"
 * 	duration: Number
 * 	color: "blue" | "pink" | "red" | "green" | "yellow"
 * 	progress: Number
 * 	style: "flat" | "round"
 * }} ProgressBarOptions
 * 
 * @typedef {{
 * 	group: HTMLDivElement
 * 	set: (options: ProgressBarOptions) => void
 * 	value: Number
 * 	progress: (progress: Number) => void
 * }} ProgressBarInstance
 */

/**
 * Create a progress bar node.
 * 
 * @param	{ProgressBarOptions}	options
 * @returns	{ProgressBarInstance}
 */
function createProgressBar({
	transition = true,
	indeterminate = false,
	warningZone = 0,
	blink,
	duration,
	color = "blue",
	progress = 0,
	style = "flat"
} = {}) {
	const container = document.createElement("div");
	container.classList.add("progressBar");

	const bar = document.createElement("bar");
	bar.classList.add("bar");

	const warning = document.createElement("div");
	warning.classList.add("warningZone");

	const indeterminateBar2 = document.createElement("div");
	indeterminateBar2.classList.add("bar", "indeterminate", "indeterminate-secondary");

	container.append(bar, warning);

	/**
	 * Update progress bar options
	 * 
	 * @param {ProgressBarOptions} options 
	 */
	const set = ({
		transition,
		indeterminate = false,
		warningZone,
		blink,
		duration,
		color,
		progress,
		style
	} = {}) => {
		if (typeof transition === "boolean")
			container.classList[transition ? "remove" : "add"]("noTransition");

		if (typeof warningZone === "number")
			if (warningZone > 0) {
				warning.style.display = null;
				warning.style.width = `${warningZone}%`;
			} else
				warning.style.display = "none";

		if (typeof blink === "string")
			bar.dataset.blink = blink;

		if (typeof duration === "number")
			bar.dataset.slow = number;

		if (typeof color === "string")
			bar.dataset.color = color;

		if (!indeterminate) {
			if (container.contains(indeterminateBar2)) {
				bar.classList.remove("indeterminate");
				container.removeChild(indeterminateBar2);
			}

			if (typeof progress === "number")
				bar.style.width = `${progress}%`;
		} else {
			if (!container.contains(indeterminateBar2)) {
				indeterminateBar2.dataset.color = bar.dataset.color;
				container.appendChild(indeterminateBar2);
				bar.classList.add("indeterminate");
				bar.style.width = null;
			}
		}

		if (typeof style === "string")
			container.dataset.style = style;
	}

	set({
		transition,
		indeterminate,
		warningZone,
		blink,
		duration,
		color,
		progress,
		style
	});

	return {
		group: container,
		set,
		
		/**
		 * Set progress value
		 * 
		 * @param	{Number}	value
		 */
		set value(value) {
			set({ progress: value })
		},

		/**
		 * Set ProgressBar's Progress
		 * 
		 * @param	{Number}	progress	Number in %
		 */
		progress: (progress) => set({ progress })
	}
}

/**
 * Disable all input inside a form
 * 
 * @param	{HTMLFormElement}		form
 */
function disableInputs(form) {
	for (let input of form.elements) {
		if (input instanceof HTMLInputElement
			|| input instanceof HTMLTextAreaElement)
			input.disabled = true;
	}
}

/**
 * Enable all input inside a form
 * 
 * @param	{HTMLFormElement}		form
 */
function enableInputs(form) {
	for (let input of form.elements) {
		// Only enable input that don't have disabled class.
		// This is for input that don't want to be enabled.
		if ((input instanceof HTMLInputElement
			|| input instanceof HTMLTextAreaElement)
			&& !input.classList.contains("disabled"))
			input.disabled = false;
	}
}

/**
 * Verify if a value is an element.
 * 
 * @param   {HTMLElement}   element
 * @returns {Boolean}
 */
function isElement(element) {
	return (element && typeof element === "object" && element.tagName);
}

/**
 * Calculate and return variance of an array.
 *
 * @param	{Number[]}	data
 * @returns	{Number}
 */
function calculateVariance(data) {
	const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
	const squaredDiff = data.map(value => Math.pow(value - mean, 2));
	const variance = squaredDiff.reduce((sum, value) => sum + value, 0) / data.length;
	return variance;
}

/**
 * Check current agent is a mobile phone?
 * 
 * @returns {Boolean}
 */
function checkAgentMobile() {
	if (typeof navigator.userAgentData === "object"
		&& typeof navigator.userAgentData.mobile === "boolean")
		return navigator.userAgentData.mobile;

	// Borrowed from Stack Overflow
	// https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
	const toMatch = Array(
		/Android/i,
		/webOS/i,
		/iPhone/i,
		/iPad/i,
		/iPod/i,
		/BlackBerry/i,
		/Windows Phone/i
	);
		
	return toMatch.some((i) => navigator.userAgent.match(i));
}

class SmoothValue {
	/**
	 * Create a new smooth value element.
	 *
	 * @param	{Object}				options
	 * @param	{String|String[]}		options.classes
	 * @param	{Number}				options.duration	Animation duration, in seconds.
	 * @param	{(Number) => Number}	options.timing		Timing functions, see {@link Easing}.
	 * @param	{Number}				options.decimal		Number of decimal points will be shown.
	 * @param	{String}				options.surfix		Text will be added to the end of the number.
	 */
	constructor({
		classes = [],
		duration = 1,
		timing = Easing.OutExpo,
		decimal = 0,
		surfix = ""
	} = {}) {
		if (typeof classes === "string")
			classes = [classes];

		this.container = document.createElement("span");
		this.container.classList.add("smooth-value", ...classes);

		this.duration = duration;
		this.timing = timing;
		this.decimal = decimal;
		this.surfix = surfix;

		/** @type {Animator} */
		this.animator = null;

		this.currentValue = 0;
		this.container.innerText = this.currentValue.toFixed(this.decimal);
	}

	set value(value) {
		this.set(value);
	}

	async set(value) {
		if (this.animator) {
			this.animator.cancel();
			this.animator = null;
		}

		if (this.currentValue === value)
			return this;

		let start = this.currentValue;
		let delta = (value - this.currentValue);

		this.animator = new Animator(this.duration, this.timing, (t) => {
			this.currentValue = start + (delta * t);
			this.container.innerText = this.currentValue.toFixed(this.decimal) + this.surfix;
		});

		await this.animator.complete();
		return this;
	}
}

class IntervalUpdater {
	/**
	 * Create a new interval updater that do an async task without piling
	 * requests when network connection is unstable.
	 *
	 * @param	{Object}				[options]
	 * @param	{number}				[options.interval]
	 * @param	{() => Promise<void>}	[options.callback]
	 */
	constructor({
		interval = 1,
		callback = async () => {}
	} = {}) {
		this.beforeUpdateHandler = () => {};
		this.updatedHandler = () => {};
		this.erroredHandler = () => {};
		this.running = false;
		this.timeout = null;
		this.lastCall = null;
		this.interval = interval;
		this.callback = callback;

		this.loading = false;
		this.pRuntime = 0;
		this.errors = 0;

		/** @type {TreeDOM} */
		this.healthNode = null;
	}

	health() {
		if (this.healthNode)
			return this.healthNode;

		this.healthNode = makeTree("div", "intup-health", {
			loading: { tag: "span", class: ["simpleSpinner", "icon"] },
			variation: { tag: "icon", class: "icon", icon: "hourglassClock" },
			latency: { tag: "icon", class: "icon", icon: "wifiExclamation" },
			errors: { tag: "icon", class: "icon", icon: "exclamation" }
		});

		this.callbackGuard = null;
		this.samples = [];
		this.variation = false;
		this.latency = false;

		return this.healthNode;
	}

	/**
	 * Run before the update was called.
	 *
	 * @param	{() => void}	f
	 * @returns	{this}
	 */
	onBeforeUpdate(f) {
		this.beforeUpdateHandler = f;
		return this;
	}

	/**
	 * Run after an update was completed successfully.
	 *
	 * @param	{(data) => void}	f
	 * @returns	{this}
	 */
	onUpdated(f) {
		this.updatedHandler = f;
		return this;
	}

	/**
	 * Run after an update generated an error.
	 *
	 * @param	{(error: Error) => void}	f
	 * @returns	{this}
	 */
	onErrored(f) {
		this.updatedHandler = f;
		return this;
	}

	start() {
		if (this.running)
			return this;

		this.running = true;
		this.update();
		return this;
	}

	async update() {
		if (!this.running)
			return;

		let start = performance.now();
		this.loading = true;
		this.beforeUpdateHandler();

		if (this.healthNode) {
			this.callbackGuard = setTimeout(() => {
				this.healthNode.loading.classList.add("display");
			}, (this.interval * 0.6) * 1000);
		}

		try {
			let data = await this.callback();
			this.updatedHandler(data);
		} catch (e) {
			this.errors += 1;
			this.healthNode.errors.classList.add("display");
			this.healthNode.errors.dataset.level = (this.errors > 2) ? "critical" : "warning";
			this.healthNode.errors.title = `${this.errors} runtime errors occured. Check console for more details.`;

			clog("WARN", `IntervalUpdater().update() generated an error while handing callback: `, e);
			this.erroredHandler(e);
		}

		this.loading = false;

		if (this.healthNode) {
			this.healthNode.loading.classList.remove("display");
			clearTimeout(this.callbackGuard);
		}

		// Safeguard.
		if (!this.running)
			return;

		let runtime = (performance.now() - start) / 1000;
		this.pRuntime = (runtime / this.interval);

		if (this.healthNode) {
			this.samples.push(runtime);

			if (this.samples.length > 5) {
				this.samples.shift();

				let variance = calculateVariance(this.samples);

				if (variance > 0.1) {
					if (!this.variation) {
						this.healthNode.variation.classList.add("display");
						this.variation = true;
					}

					this.healthNode.variation.dataset.level = (variance >= 0.2)
						? "critical"
						: "warning";

					this.healthNode.variation.title = `Connection unstable! Variation ${(variance * 1000).toFixed(1)}ms`
				} else {
					if (this.variation) {
						this.healthNode.variation.classList.remove("display");
						this.variation = false;
					}
				}
			}

			if (this.pRuntime >= 0.6) {
				if (!this.latency) {
					this.healthNode.latency.classList.add("display");
					this.latency = true;
				}

				this.healthNode.latency.dataset.level = (this.pRuntime >= 1)
					? "critical"
					: "warning";

				this.healthNode.latency.title = `Update took ${(this.pRuntime * 100).toFixed(1)}% of expected runtime (${(this.interval * 1000)}ms)`;
			} else {
				if (this.latency) {
					this.healthNode.latency.classList.remove("display");
					this.latency = false;
				}
			}
		}

		let wait = (this.interval - runtime) * 1000;
		this.timeout = setTimeout(() => this.update(), wait);
	}

	stop() {
		if (!this.running)
			return this;

		this.running = false;
		clearTimeout(this.timeout);
		return this;
	}
}

const cookie = {
	cookie: null,

	getAll() {
		const mycookie = document.cookie.split("; ");
		let dacookie = {};

		for (let i = 0; i < mycookie.length; i++) {
			let t = mycookie[i].split("=");
			dacookie[t[0]] = t[1];
		}

		this.cookie = dacookie;
		return dacookie;
	},

	get(key, def = null) {
		if (!this.cookie)
			this.cookie = this.getAll();

		if (def !== null && typeof this.cookie[key] === "undefined")
			this.set(key, def, 9999);

		return this.cookie[key] || def;
	},

	set(key, value = "", days = 0, path = "/") {
		let exp = "";
		if (days !== 0 && typeof days === "number") {
			let date = new Date();
			date.setTime(date.getTime() + (days*24*60*60*1000));
			exp = `; expires=${date.toUTCString()}`;
		}

		document.cookie = `${key}=${value}${exp}; path=${path}`;

		this.cookie = this.getAll();
		return true;
	},
}

//? |-----------------------------------------------------------------------------------------------|
//? |  from web-clog.js                                                                             |
//? |                                                                                               |
//? |  Copyright (c) 2018-2023 Belikhun. All right reserved                                         |
//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
//? |-----------------------------------------------------------------------------------------------|

var clogListeners = []

/**
 * Register on log event.
 * @param	{(level: CLogLevel, args: CLogArg[]) => any}	f
 */
function onCLOG(f) {
	if (typeof f !== "function")
		throw { code: -1, description: `onCLOG(): not a valid function!` }

	clogListeners.push(f);
}

/**
 * @typedef {"OKAY" | "INFO" | "WARN" | "ERRR" | "CRIT" | "DEBG" | "LCNT"} CLogLevel
 * @typedef {{
 * 	color: String
 * 	text: String
 * 	padding: Number
 * 	separate: Boolean
 * } | string} CLogArg
 * 
 * Log to console, with sparkles!
 * @param	{CLogLevel}		level	Log level
 * @param	{...CLogArg}	args	Log info
 */
function clog(level, ...args) {
	// We only want to log DEBG level in development mode
	if (level.toUpperCase() === "DEBG" && !(typeof DEBUG === "boolean" && DEBUG === true))
		return;

	const font = "Consolas";
	const size = "12";
	let date = new Date();
	const rtime = round(sc.stop, 3).toFixed(3);
	let str = "";

	level = level.toUpperCase();
	lc = flatc({
		DEBG: "blue",
		OKAY: "green",
		INFO: "magenta",
		WARN: "yellow",
		ERRR: "red",
		CRIT: "gray",
	}[level])

	/** @type {CLogArg[]} */
	let text = [
		{
			color: flatc("aqua"),
			text: `${pleft(date.getHours(), 2)}:${pleft(date.getMinutes(), 2)}:${pleft(date.getSeconds(), 2)}`,
			padding: 8,
			separate: true
		}, {
			color: flatc("blue"),
			text: rtime,
			padding: 8,
			separate: true
		}, {
			color: flatc("red"),
			text: window.location.pathname,
			padding: 16,
			separate: true
		}, {
			color: lc,
			text: level,
			padding: 6,
			separate: true
		}
	]

	text = text.concat(args);
	let n = 2;
	let out = new Array();

	/** @type {CLogArg} */
	let item;

	out[0] = "%c ";
	out[1] = `padding-left: ${["INFO", "OKAY", "DEBG", "LCNT"].includes(level) ? 10 : 0}px`;

	// i | 1   2   3   4   5     6
	// j | 0   1   2   3   4     5
	// n | 1 2 3 4 5 6 7 8 9 10 11
	for (let i = 1; i <= text.length; i++) {
		item = text[i - 1];

		if (typeof item === "boolean")
			item = item ? "true" : "false";

		if (typeof item === "undefined")
			item = "undefined";

		if (typeof item === "string" || typeof item === "number") {
			if (i > 4)
				str += `${item} `;

			out[0] += `%c${item} `;
			out[n++] = `font-size: ${size}px; font-family: ${font}; color: ${flatc("black")}`;
		} else if (typeof item === "object") {
			if (item === null || item === undefined || typeof item.text === "undefined") {
				out[n++] = item;

				if (item && item.code && item.description)
					str += `[${item.code}] ${item.description} `;
				else if (item && item.name && item.message)
					str += `${item.name} >>> ${item.message} `;
				else
					str += JSON.stringify(item) + " ";

				continue;
			}

			let t = pleft(item.text, ((item.padding) ? item.padding : 0));
			if (i > 4)
				str += `${t} `;

			out[0] += `%c${t}`;

			if (item.separate) {
				out[0] += "%c| ";
				out[n++] = out[n++] = `font-size: ${size}px; color: ${item.color}; font-weight: bold;`;
			} else {
				out[0] += " ";
				out[n++] = `font-size: ${size}px; font-family: ${font}; color: ${item.color}`;
			}
		} else
			console.error(`clog(): unknown type ${typeof item}`, item);
	}

	for (let f of clogListeners) {
		try {
			f(level, args);
		} catch(e) {
			console.warn("clog(): error occured while handing listener", e);
			continue;
		}
	}

	switch (level) {
		case "DEBG":
			console.debug.apply(this, out);
			break;

		case "WARN":
			console.warn.apply(this, out);
			break;

		case "ERRR":
			console.error.apply(this, out);
			break;

		case "CRIT":
			console.error.apply(this, out);
			break;

		default:
			console.log.apply(this, out);
			break;
	}
}

const popup = {
	/** @type {TreeDOM} */
	popup: undefined,

	/** @type {TreeDOM} */
	popupNode: undefined,

	/** @type {TriangleBackground} */
	background: undefined,

	initialized: false,
	showing: false,

	levelTemplate: {
		light: {
			okay: { bg: "green", icon: "check", h: "dark", b: "light" },
			warning: { bg: "yellow", icon: "exclamation", h: "dark", b: "light" },
			error: { bg: "red", icon: "bomb", h: "light", b: "light" },
			offline: { bg: "gray", icon: "unlink", h: "light", b: "light" },
			confirm: { bg: "blue", icon: "question", h: "dark", b: "light" },
			info: { bg: "purple", icon: "info", h: "light", b: "light" }
		},
		dark: {
			okay: { bg: "darkGreen", icon: "check", h: "light", b: "dark" },
			warning: { bg: "darkYellow", icon: "exclamation", h: "light", b: "dark" },
			error: { bg: "darkRed", icon: "bomb", h: "light", b: "dark" },
			offline: { bg: "gray", icon: "unlink", h: "light", b: "dark" },
			confirm: { bg: "darkBlue", icon: "question", h: "light", b: "dark" },
			info: { bg: "purple", icon: "info", h: "light", b: "dark" }
		}
	},

	init() {
		this.popupNode = makeTree("div", "popupContainer", {
			popup: { tag: "div", class: "popupWindow", child: {
				header: { tag: "div", class: "header", child: {
					top: { tag: "span", class: "top", child: {
						windowTitle: { tag: "t", class: ["windowTitle", "text-overflow"] },
						close: { tag: "span", class: "close", title: "Đóng" }
					}},

					icon: { tag: "icon" },
					text: { tag: "t", class: "text" }
				}},

				body: { tag: "div", class: "body", child: {
					top: { tag: "div", class: "top", child: {
						message: { tag: "t", class: "message" },
						description: { tag: "t", class: "description" }
					}},

					note: createNote(),
					customNode: { tag: "div", class: "customNode" },
					button: { tag: "div", class: "buttonGroup" }
				}}
			}}
		});

		this.popup = this.popupNode.popup;
		this.popup.body.note.group.style.display = "none";
		document.body.insertBefore(this.popupNode, document.body.childNodes[0]);

		if (typeof sounds !== "undefined")
			sounds.applySound(this.popup.header.top.close, ["soundhover", "soundselect"]);

		this.initialized = true;
	},

	show({
		windowTitle = "Popup",
		title = "Title",
		message = "Message",
		description = "Description",
		note = null,
		noteLevel = null,
		level = "info",
		icon = null,
		bgColor = null,
		headerTheme = null,
		bodyTheme = null,
		customNode = null,
		buttonList = {}
	} = {}) {
		return new Promise((resolve, reject) => {
			if (!this.initialized) {
				reject({ code: -1, description: "popup not initialized. Please initialize it first by using popup.init()" });
				return;
			}

			this.popup.dataset.level = level;

			//* THEME
			let template = document.body.classList.contains("dark")
				? this.levelTemplate.dark
				: this.levelTemplate.light;

			if (template[level])
				template = template[level];
			else
				reject({ code: -1, description: `Unknown level: ${level}` })

			this.background = triBg(this.popup.header, {
				scale: 4,
				speed: 64,
				color: (typeof bgColor === "string")
					? bgColor
					: template.bg
			});

			this.popup.header.icon.dataset.icon = (typeof icon === "string") ? icon : template.icon;
			this.popup.header.setAttribute("theme", (typeof headerTheme === "string") ? headerTheme : template.h);
			this.popup.body.setAttribute("theme", (typeof bodyTheme === "string") ? bodyTheme : template.b);

			//* HEADER
			this.popup.header.top.windowTitle.innerText = windowTitle;
			this.popup.header.text.innerText = title;

			//* BODY
			this.popup.body.top.message.innerHTML = message;
			this.popup.body.top.description.innerHTML = description;

			if (note) {
				this.popup.body.note.group.style.display = null;
				this.popup.body.note.set({
					level: noteLevel || level,
					message: note
				});
			} else
				this.popup.body.note.group.style.display = "none";

			if (customNode && customNode.classList) {
				customNode.classList.add("customNode");
				this.popup.body.replaceChild(customNode, this.popup.body.customNode);
				this.popup.body.customNode = customNode;
			} else
				this.popup.body.customNode.style.display = "none";

			//* BODY BUTTON
			this.popup.header.top.close.onclick = () => {
				resolve("close");
				this.hide();
			}

			emptyNode(this.popup.body.button);
			let buttonKeyList = Object.keys(buttonList);
			
			for (let key of buttonKeyList) {
				let item = buttonList[key];

				let button = createButton(item.text || "Text", {
					color: item.color,
					icon: item.icon || null,
					complex: !!item.complex
				});

				button.classList.add(item.full ? "full" : "normal");
				button.onclick = item.onClick || null;
				button.returnValue = key;

				if (!(typeof item.resolve === "boolean") || item.resolve !== false)
					button.addEventListener("mouseup", () => {
						resolve(key);
						this.hide();
					});

				this.popup.body.button.appendChild(button);
			}

			this.popupNode.classList.add("show");
			this.showing = true;

			if (typeof sounds !== "undefined")
				sounds.select();
		});
	},

	/**
	 * Update popup's message
	 * @param	{String}	message
	 */
	set message(message) {
		this.popupNode.popup.body.top.message.innerText = message;
	},

	hide() {
		this.popupNode.classList.remove("show");

		if (this.showing)
			this.popup.header.removeChild(fcfn(this.popup.header, "triangleBackground"));

		this.showing = false;
		emptyNode(this.popup.body.button);
		emptyNode(this.popup.body.customNode);
	}
}

const ConnectionState = {
	initialized: false,
	HOST: window.location.origin,
	NAME: `Trang web`,

	container: document.body,

	/** @type {TreeDOM} */
	view: undefined,

	viewBG: undefined,

	/** @type {"online" | "offline" | "ratelimited"} */
	state: "online",

	enabled: true,
	haltRequests: true,

	checkEvery: 2000,
	checkInterval: null,
	checkCount: 0,

	stateListeners: [],

	init() {
		clog("INFO", `Initializing`, {
			text: "ConnectionState",
			color: flatc("blue")
		});

		this.view = makeTree("div", "connectionStatePanel", {
			info: { tag: "span", class: "info", child: {
				titleNode: { tag: "div", class: "title", text: "Sample Title" },
				description: { tag: "div", class: "description", text: "Heheh is this descripting?" }
			}},

			button: createButton("BUTTON", {
				color: "darkBlue",
				complex: true,
				disabled: true
			}),

			spinner: { tag: "span", class: ["simpleSpinner", "big"] },
			icon: { tag: "icon", data: { icon: "unlink" } }
		});

		this.viewBG = triBg(this.view);
		this.setView({ background: "red" });
		this.initialized = true;
	},

	setView({
		background = undefined,
		title = undefined,
		description = undefined,
		button = undefined,
		icon = undefined
	}) {
		if (typeof background === "string")
			this.viewBG.color = background;
		
		if (typeof title === "string")
			this.view.info.titleNode.innerText = title;
		
		if (typeof description === "string") {
			this.view.info.description.classList.add("show");
			this.view.info.description.innerText = description;
		} else if (description === null) {
			this.view.info.description.classList.remove("show");
		}
		
		if (typeof button === "string") {
			this.view.button.classList.add("show");
			this.view.button.changeText(button);
		} else if (button === null) {
			this.view.button.classList.remove("show");
		}

		if (typeof icon === "string") {
			if (icon === "loading")
				this.view.classList.add("loading");
			else {
				this.view.classList.remove("loading");
				this.view.icon.dataset.icon = icon;
			}
		}
	},

	/**
	 * Check if url is a request to local server
	 * @param	{String}	url
	 * @returns {Boolean}
	 */
	validHost(url) {
		return url.startsWith(this.HOST);
	},

	async show() {
		this.container.appendChild(this.view);
		await nextFrameAsync();
		this.view.classList.add("show");
	},

	async hide() {
		if (!this.container.contains(this.view))
			return;
		
		this.view.classList.remove("show");
		await delayAsync(600);
		this.container.removeChild(this.view);
	},

	change(state = "online", data = {}) {
		return new Promise((resolve, reject) => {
			if (!this.initialized)
				this.init();

			if (!this.enabled) {
				resolve({ code: 0, description: "Module Disabled", data: { disabled: true } });
				return;
			}

			const s = ["online", "offline", "ratelimited"];
			if (!typeof state === "string" || state === this.state || s.indexOf(state) === -1) {
				let t = {code: -1, description: `Unknown state or rejected: ${state}`}
				reject(t);
				return;
			}

			clog("INFO", `We just went`, {
				text: state,
				color: flatc("yellow")
			});

			this.state = state;
			this.__triggerOnStateChange(state);
			clearInterval(this.checkInterval);

			switch(state) {
				case "online":
					clog("OKAY", "Đã kết nối tới máy chủ.");
					resolve();

					this.setView({
						background: "green",
						title: "Đã kết nối tới máy chủ!",
						description: null,
						button: null,
						icon: "check"
					});

					setTimeout(() => this.hide(), 2000);
					break;

				case "offline":
					let checkTimeout = null;
					let doCheck = true;

					clog("LCNT", "Mất kết nối tới máy chủ.");
					this.checkCount = 0;

					this.setView({
						background: "orange",
						title: "Mất kết nối!",
						description: null,
						button: null,
						icon: "unlink"
					});

					this.show();

					let checker = async () => {
						this.checkCount++;
						clog("INFO", `Đang thử kết nối lại... [Lần ${this.checkCount}]`);
						this.setView({ button: `KẾT NỐI LẠI (${this.checkCount})` });

						let data = await checkServer(this.HOST);

						if (data.online) {
							doCheck = false;
							this.change("online");
							resolve();
						}
					}

					let checkHandle = async () => {
						clearTimeout(checkTimeout);

						if (!doCheck)
							return;

						// Start time
						let timer = new StopClock();

						try {
							await checker();
						} catch(e) {}

						checkTimeout = setTimeout(() => checkHandle(), this.checkEvery - timer.stop * 1000);
					}

					setTimeout(() => {
						this.setView({
							background: "red",
							description: `${this.NAME} đang cố gắng kết nối lại tới máy chủ...`,
							button: "KẾT NỐI LẠI (0)",
							icon: "loading"
						});

						checkHandle();
					}, this.checkEvery);
					break;

				case "ratelimited":
					let counterer = () => {}

					clog("LCNT", data.description);
					this.__checkTime = parseInt(data.data.reset);
					// this.__sbarItem = (sbar) ? sbar.additem(`Kết nối lại sau [${this.__checkTime}] giây`, "spinner", {align: "right"}) : null;

					this.checkInterval = setInterval(() => {
						this.__checkTime--;
						counterer(this.__checkTime);

						// if (this.__sbarItem)
						// 	this.__sbarItem.change(`Kết nối lại sau [${this.__checkTime}] giây`);

						if (this.__checkTime <= 0) {
							this.change("online");
							resolve();
						}
					}, 1000);
					break;
			}
		});
	},

	/**
	 * Listen for state change event
	 * @param {(state: "online" | "offline" | "ratelimited") => any} f 
	 */
	onStateChange(f) {
		if (typeof f === "function")
			return this.stateListeners.push(f) - 1;
	},

	__triggerOnStateChange(state) {
		for (let i of this.stateListeners)
			i(state);
	},

	async check() {
		let data = await checkServer(this.HOST);

		if (data.online)
			return true;

		// We are offline, change state now.
		this.change("offline");
		return false;
	},

	backOnline() {
		if (this.state === "online")
			return;

		return new Promise((resolve) => {
			let index = this.onStateChange((state) => {
				if (state === "online") {
					this.stateListeners.splice(index, 1);
					resolve();
				}
			})
		});
	}
}

const mouseCursor = {
	/**
	 * X Position of Mouse cursor in the screen
	 * @type {Number}
	 */
	x: 0,

	/**
	 * Y Position of Mouse cursor in the screen
	 * @type {Number}
	 */
	y: 0,

	/**
	 * The change amount in X coordinates between current position
	 * and last position
	 * @type {Number}
	 */
	deltaX: 0,

	/**
	 * The change amount in Y coordinates between current position
	 * and last position
	 * @type {Number}
	 */
	deltaY: 0,

	/**
	 * Current element under the cursor
	 * @type {HTMLElement}
	 */
	target: null,

	/**
	 * Update Function
	 * @param {MouseEvent} event 
	 */
	update(event) {
		this.x = event.clientX;
		this.y = event.clientY;
		this.deltaX = event.movementX;
		this.deltaY = event.movementY;
	}
}

//? =================
//?    SCRIPT INIT

window.addEventListener("mousemove", (e) => mouseCursor.update(e), { passive: true });

let sc = new StopClock();
clog("INFO", "Log started at:", {
	color: flatc("green"),
	text: (new Date()).toString()
})

// Error handling
window.addEventListener("error", e => {
	clog("CRIT", {
		color: flatc("red"),
		text: e.message
	}, "at", {
		color: flatc("aqua"),
		text: `${e.filename}:${e.lineno}:${e.colno}`
	})
});

if (typeof String.prototype.replaceAll !== "function")
	/**
	 * Returns a new string with all matches
	 * of a `search` replaced by a `replacement`
	 * 
	 * @param	{String}	search
	 * A String that is to be replaced by replacement.
	 * It is treated as a literal string and is not
	 * interpreted as a regular expression.
	 * 
	 * @param	{String}	replacement
	 * The String that replaces the substring specified
	 * by the specified search parameter.
	 */
	String.prototype.replaceAll = function(search, replacement) {
		return this.replace(new RegExp(search, "g"), replacement);
	}

// window.addEventListener("unhandledrejection", (e) => {
//      promise: e.promise; reason: e.reason
// })