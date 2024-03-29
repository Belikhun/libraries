/**
 * /assets/tests/tests.js
 * 
 * Test framework wrapper, for easier writing tests and
 * stuff...
 * 
 * @author		Belikhun
 * @version		1.0
 * @license		MIT
 * @copyright	2018-2023 Belikhun
 */

const tests = {
	container: $("#app"),

	/** @type {TestFramework} */
	framework: undefined,

	async init() {
		// Enable debug logging
		window.DEBUG = true;

		// Wrap localStorage get/set
		const lsg = localStorage.__proto__.getItem;
		let lss = localStorage.__proto__.setItem;
		const lsr = localStorage.__proto__.removeItem;
		localStorage.__proto__.getItem = (key) => lsg.apply(localStorage, [`testfw.${key}`]);
		localStorage.__proto__.setItem = (key, value) => lss.apply(localStorage, [`testfw.${key}`, value]);
		localStorage.__proto__.removeItem = (key) => lsr.apply(localStorage, [`testfw.${key}`]);

		const params = new URLSearchParams(window.location.search);
		const autoTest = params.get("autotest") === "true";

		this.framework = new TestFramework(this.container, {
			timeout: 200,
			logSteps: autoTest
		});

		// Register
		let sceneIDs = Object.keys(this.scenes);
		for (let sceneID of sceneIDs) {
			if (typeof this.scenes[sceneID].name !== "string")
				continue;

			this.log("DEBG", `registering scene "${sceneID}"`);
			let sceneObj = this.scenes[sceneID];
			let scene = this.framework.addScene({
				id: sceneID,
				name: sceneObj.name,
				classes: sceneObj.classes || [],

				setup: (typeof sceneObj.setup === "function")
					? async (scene) => await sceneObj.setup(scene)
					: () => {},
				
				activate: (typeof sceneObj.activate === "function")
					? async (scene) => {
						location.hash = scene.id;
						await sceneObj.activate(scene);
					} : (scene) => location.hash = scene.id,

				dispose: (typeof sceneObj.dispose === "function")
					? async (scene) => await sceneObj.dispose(scene)
					: () => {}
			});

			await scene.setup();
			let groupIDs = Object.keys(sceneObj);
			for (let groupID of groupIDs) {
				if (typeof sceneObj[groupID] !== "object")
					continue;

				if (typeof sceneObj[groupID].name !== "string")
					continue;

				this.log("DEBG", `registering group "${groupID}"`);
				sceneObj[groupID].parent = sceneObj;

				let groupObj = sceneObj[groupID];
				let group = scene.addGroup({
					id: groupID,
					name: groupObj.name,

					setup: (typeof groupObj.setup === "function")
						? async (group) => await groupObj.setup(group)
						: () => {},

					activate: (typeof groupObj.activate === "function")
						? async (group) => await groupObj.activate(group)
						: () => {},

					dispose: (typeof groupObj.dispose === "function")
						? async (group) => await groupObj.dispose(group)
						: () => {}
				});

				let stepIDs = Object.keys(groupObj);
				for (let stepID of stepIDs) {
					if (["setup", "activate", "dispose"].includes(stepID))
						continue;

					if (typeof groupObj[stepID] !== "function")
						continue;

					this.log("DEBG", `registering step "${stepID}"`);
					group.addStep({
						name: stepID,
						run: async (step) => await groupObj[stepID](step)
					});
				}
			}
		}

		if (autoTest) {
			// Begin auto testing
			this.framework.run();
		} else {
			let hash = location.hash.replace("#", "");
			let found = false;
	
			if (hash !== "") {
				// Find scene with this hash
				for (let scene of this.framework.scenes) {
					if (scene.id === hash) {
						scene.activate();
						found = true;
						break;
					}
				}
			}
	
			if (!found) {
				// Activate first scene
				if (this.framework.scenes[0])
					this.framework.scenes[0].activate();
			}
		}
	},

	/**
	 * @typedef {{
	 * 	[x: String]: (step: TestFrameworkStep) => Promise<Boolean>
	 * 	store: {
	 * 		node: HTMLElement
	 * 		buttons: SQButton[]
	 * 	}
	 * 	parent: ScenesTree
	 * } & TestFrameworkGroupOptions} GroupsTree
	 * 
	 * @typedef {{
	 * 	[x: String]: GroupsTree
	 *	store: {
	 * 		node: HTMLElement
	 * 		buttons: SQButton[]
	 * 	}
	 * } & TestFrameworkSceneOptions} ScenesTree
	 * 
	 * @type {Object<string, ScenesTree>}
	 */
	scenes: {}
}