/**
 * /assets/tests/framework.js
 * 
 * The previousn't generation testing framework.
 * Provide separate screen > group > step, autorun
 * and automatic logging.
 * 
 * I'm designing this to work with selenium, for running
 * CI in github actions. If I'm not wrong, it's very easy
 * to write tests for this framework.
 * 
 * @author	Belikhun
 * @version	1.0
 * @license	MIT
 */
class TestFramework {
	/**
	 * Test framework instance
	 * @param	{HTMLElement}	container 
	 * @param	{Object}		options 
	 * @param	{Boolean}		autoplay	Auto perform tests
	 * @param	{Number}		timeout		Delay in each steps 
	 * @param	{Boolean}		logSteps	Write step log into local storage
	 */
	constructor(container, {
		autoplay = false,
		autoNextScene = false,
		timeout = 500,
		logSteps = false
	} = {}) {
		if (typeof container !== "object" || !container.classList)
			throw { code: -1, description: `TestFramework(): not a valid container!` }

		this.container = container;
		this.autoplay = autoplay;
		this.autoNextScene = autoNextScene;
		this.timeout = timeout;
		this.isPlaying = false;
		this.logSteps = logSteps;
		this.logStart = null;
		this.logs = []
		this.total = 0;
		this.passed = 0;
		this.skipped = 0;
		this.failed = 0;
		this.broken = 0;
		this.errored = 0;

		/** @type {TestFrameworkScene[]} */
		this.scenes = []

		/** @type {TestFrameworkScene} */
		this.activeScene = undefined;

		/** @type {Scrollable} */
		this.stepsScroll = undefined;

		this.scenesNode = document.createElement("span");
		this.scenesNode.classList.add("scenes");

		this.view = makeTree("span", "viewer", {
			header: { tag: "div", class: "header", child: {
				autoplay: { tag: "span", class: ["input", "autoplay"], child: {
					label: { tag: "span", class: "label", text: "autoplay" },
					input: {
						tag: "input",
						type: "checkbox",
						checked: this.autoplay
					}
				}},

				autoscene: { tag: "span", class: ["input", "autoscene"], child: {
					label: { tag: "span", class: "label", text: "autoplay next scene" },
					input: {
						tag: "input",
						type: "checkbox",
						checked: this.autoNextScene
					}
				}},

				fulltest: { tag: "button", class: ["input", "fulltest"], text: "full test" },

				timeout: { tag: "span", class: ["input", "timeout"], child: {
					label: { tag: "span", class: "label", text: "timeout" },
					input: {
						tag: "input",
						type: "range",
						class: ["sq-slider", "blue"],
						min: 100,
						max: 5000,
						step: 100,
						value: this.timeout
					},

					value: { tag: "span", class: "value", text: this.timeout + "ms" }
				}}
			}},

			panel: { tag: "div", class: "panel", child: {
				steps: { tag: "div", class: "steps", child: {
					sceneName: { tag: "div", class: "title" },
					inner: { tag: "div", class: "inner" }
				}},

				field: { tag: "div", id: "testField", class: "field" }
			}}
		});

		if (typeof Scrollable === "function") {
			this.stepsScroll = new Scrollable(this.view.panel.steps, {
				content: this.view.panel.steps.inner
			});
		}
		
		this.view.header.autoplay.input.addEventListener("input", () => {
			this.autoplay = this.view.header.autoplay.input.checked;

			if (this.activeScene && this.autoplay)
				this.activeScene.autoplay();
		});

		this.view.header.autoscene.input.addEventListener("input", () => {
			this.autoNextScene = this.view.header.autoscene.input.checked;
		});

		this.view.header.fulltest.addEventListener("click", async (e) => {
			e.target.disabled = true;
			await this.run();
			e.target.disabled = false;
		});

		this.view.header.timeout.input.addEventListener("input", () => {
			this.timeout = parseInt(this.view.header.timeout.input.value);
			this.view.header.timeout.value.innerText = this.timeout + "ms";
		});

		this.container.append(this.scenesNode, this.view);
	}

	get stepsNode() {
		return this.view.panel.steps.inner;
	}

	get field() {
		return this.view.panel.field;
	}

	async run(from = 0) {
		if (this.isPlaying)
			return;

		// From 0 mean we are performing full test.
		// Value different from 0 probally mean this
		// function is bubbled from a scene.
		if (from === 0) {
			this.total = 0;
			this.passed = 0;
			this.skipped = 0;
			this.failed = 0;
			this.broken = 0;
			this.errored = 0;
			this.logStart = null;
			localStorage.removeItem("test.framework.logs");
			this.log("start");
		}

		this.isPlaying = true;
		for (let i = from; i < this.scenes.length; i++) {
			if (this.scenes[i].isPlaying)
				throw { code: -1, description: `TestFramework().run(): conflicting running scene detected!` }

			clog("DEBG", `TestFramework().run(): activate scene ${i}`);
			await this.scenes[i].activate(false);
			clog("DEBG", `TestFramework().run(): run scene ${i}`);
			await this.scenes[i].run();
		}

		this.isPlaying = false;

		// Report result
		if (from === 0) {
			clog("OKAY", `TestFramework().run(): FULL TEST COMPLETED!`);
			this.log("completed", this.total, this.passed, this.skipped, this.failed, this.broken, this.errored);

			for (let key of ["total", "passed", "skipped", "failed", "broken", "errored"])
				clog("OKAY", `TestFramework().run():  + ${pleft(key, 8, true)} = ${pleft(this[key], 2)}`);

			// Reset
			this.logStart = null;
			this.logs = []
		}
	}

	/**
	 * Log step to local storage, which selenium will scrape data from
	 * it when running.
	 * @param  {...String} steps 
	 */
	log(...steps) {
		if (!this.logSteps)
			return;

		if (!this.logStart)
			this.logStart = performance.now();

		steps.unshift((performance.now() - this.logSteps) / 1000);
		this.logs.push(steps);
		localStorage.setItem("test.framework.logs", JSON.stringify(this.logs));
		clog("DEBG", `TestFramework().log():`, steps);
	}

	/**
	 * Add a new scene
	 * @param	{TestFrameworkSceneOptions}		options
	 * @return	{TestFrameworkScene}
	 */
	addScene(options) {
		let scene = new TestFrameworkScene(this, options);
		this.scenes.push(scene);
		return scene;
	}
}

/**
 * @typedef {{
 * 	id: String
 * 	name: String
 * 	classes: String | String[]
 * 	setup(scene: TestFrameworkScene)
 * 	activate(scene: TestFrameworkScene)
 * 	dispose(scene: TestFrameworkScene)
 * }} TestFrameworkSceneOptions
 */

class TestFrameworkScene {
	/**
	 * Construct a new scene
	 * 
	 * Remember to call `await .setup()` before using!!!
	 * @param	{TestFramework}					instance
	 * @param	{TestFrameworkSceneOptions}		options
	 */
	constructor(instance, {
		id = "SampleScene",
		name = "Sample Scene",
		classes = [],
		setup = () => {},
		activate = () => {},
		dispose = () => {}
	} = {}) {
		this.id = id;
		this.name = name;
		this.classes = classes;
		this.instance = instance;
		this.setupHandler = setup;
		this.activateHandler = activate;
		this.disposeHandler = dispose;
		this.isPlaying = false;
		this.disabled = false;

		this.button = makeTree("button", ["tests-btn", "scene"], {
			idValue: { tag: "div", class: "id", text: this.id },
			nameValue: { tag: "div", class: "name", text: this.name }
		});

		this.button.addEventListener("click", () => this.activate());

		/** @type {TestFrameworkGroup[]} */
		this.groups = []
	}

	async setup() {
		this.instance.log("scene", this.id, "name", this.name);

		this.button.disabled = true;
		this.instance.log("scene", this.id, "setup", "start");

		this.instance.scenesNode.appendChild(this.button);
		await this.setupHandler();

		this.button.disabled = false;
		this.instance.log("scene", this.id, "setup", "complete");
	}

	async activate(autoplay = true) {
		if (this.instance.activeScene === this || this.disabled)
			return;

		this.button.disabled = true;
		this.instance.log("scene", this.id, "activate", "start");

		try {
			// Dispose currently active scene.
			if (this.instance.activeScene)
				await this.instance.activeScene.dispose();
	
			// Apply classes to field
			this.field.className = "field";
			switch (typeof this.classes) {
				case "string":
					this.field.classList.add(this.classes);
					break;
				
				case "object":
					if (this.classes.length && this.classes.length >= 0)
						this.field.classList.add(...this.classes);
	
					break;
			}
	
			this.instance.activeScene = this;
			this.instance.view.panel.steps.sceneName.innerText = this.name;
			await this.activateHandler(this);
			emptyNode(this.instance.stepsNode);
	
			for (let group of this.groups)
				await group.setup();

			this.button.disabled = false;
			this.button.classList.add("active");
			this.instance.log("scene", this.id, "activate", "complete");
		} catch(e) {
			let error = parseException(e);
			this.disabled = true;
			this.button.classList.add("errored");
			this.button.disabled = true;
			this.instance.errored += 1;

			clog("ERRR", `TestFrameworkScene(${this.id}).activate(): an error occured while setting up scene`, e);
			this.instance.log("scene", this.id, "activate", "errored", error.code, error.description);
		}

		if (autoplay)
			this.autoplay();
	}

	async dispose() {
		if (this.disabled)
			return;

		this.button.disabled = true;
		clog("INFO", `TestFrameworkScene(${this.id}).dispose(): disposing scene`);
		this.instance.log("scene", this.id, "dispose", "start");

		try {
			for (let group of this.groups)
				await group.dispose();
	
			await this.disposeHandler(this);
		} catch(e) {
			let error = parseException(e);
			this.disabled = true;
			this.button.classList.add("errored");
			this.button.disabled = true;
			this.instance.errored += 1;

			clog("ERRR", `TestFrameworkScene(${this.id}).dispose(): an error occured while disposing scene`, e);
			this.instance.log("scene", this.id, "dispose", "errored", error.code, error.description);
			return;
		}
		
		this.button.disabled = false;
		this.reset();
		this.instance.log("scene", this.id, "dispose", "complete");
	}

	async autoplay() {
		if (this.instance.autoplay && !this.isPlaying && this.groups[0]) {
			clog("DEBG", `TestFrameworkScene(${this.id}).activate(): autoplaying...`);
			this.resetGroups();
			await this.run();
		}
	}

	reset() {
		this.button.classList.remove("active");
		emptyNode(this.field);
		this.resetGroups();
	}

	async run(from = 0) {
		if (this.isPlaying || this.disabled)
			return;

		this.isPlaying = true;
		this.instance.log("scene", this.id, "run", "start");

		for (let i = from; i < this.groups.length; i++) {
			if (this.groups[i].disabled)
				continue;

			await this.groups[i].run();
		}

		this.isPlaying = false;
		this.instance.log("scene", this.id, "run", "complete");

		if (this.instance.autoNextScene && !this.instance.isPlaying) {
			let index = this.instance.scenes.indexOf(this);
			this.instance.run(index + 1);
		}
	}

	resetGroups() {
		for (let group of this.groups)
			group.reset();
	}

	/**
	 * Add a new group
	 * @param	{TestFrameworkGroupOptions}		options
	 * @return	{TestFrameworkGroup}
	 */
	addGroup(options) {
		let group = new TestFrameworkGroup(this, options);
		this.groups.push(group);
		return group;
	}

	get field() {
		return this.instance.field;
	}
}

/**
 * @typedef {{
 * 	id: String
 * 	name: String
 * 	setup(group: TestFrameworkGroup)
 * 	activate(group: TestFrameworkGroup)
 * 	dispose(group: TestFrameworkGroup)
 * }} TestFrameworkGroupOptions
 */

class TestFrameworkGroup {
	/**
	 * Construct a new group that contain test steps
	 * @param	{TestFrameworkScene}			scene
	 * @param	{TestFrameworkGroupOptions}		options
	 */
	constructor(scene, {
		id = "Group1",
		name = "Sample Group",
		setup = () => {},
		activate = () => {},
		dispose = () => {}
	} = {}) {
		this.id = id;
		this.name = name;
		this.scene = scene;
		this.setupHandler = setup;
		this.activateHandler = activate;
		this.disposeHandler = dispose;
		this.disabled = false;
		this.isRunning = false;

		this.button = makeTree("button", ["tests-btn", "group"], {
			idValue: { tag: "div", class: "id", text: this.id },
			nameValue: { tag: "div", class: "name", text: this.name }
		});

		this.button.addEventListener("click", () => this.activate());

		/** @type {TestFrameworkStep[]} */
		this.steps = []
	}

	async setup() {
		this.instance.log("group", this.id, "name", this.name);

		this.instance.log("group", this.id, "setup", "start");
		this.button.disabled = true;
		this.instance.stepsNode.appendChild(this.button);

		try {
			await this.setupHandler(this);
			for (let step of this.steps)
				await step.setup();
		} catch(e) {
			let error = parseException(e);
			this.disabled = true;
			this.button.classList.add("errored");
			this.button.disabled = true;
			this.instance.errored += 1;

			clog("ERRR", `TestFrameworkGroup(${this.id}).setup(): an error occured while setting up group`, e);
			this.instance.log("group", this.id, "setup", "errored", error.code, error.description);
			return;
		}

		this.button.disabled = false;
		this.instance.log("group", this.id, "setup", "complete");
	}

	async activate() {
		if (this.disabled)
			return;

		this.instance.log("group", this.id, "activate", "start");

		try {
			await this.activateHandler(this);
			await this.run();
		} catch(e) {
			let error = parseException(e);
			this.disabled = true;
			this.button.classList.add("errored");
			this.button.disabled = true;
			this.instance.errored += 1;

			clog("ERRR", `TestFrameworkGroup(${this.id}).activate(): an error occured while setting up group`, e);
			this.instance.log("group", this.id, "activate", "errored", error.code, error.description);
			return;
		}

		this.instance.log("group", this.id, "activate", "complete");
	}

	async dispose() {
		if (this.disabled)
			return;
		
		this.button.disabled = true;
		clog("INFO", `TestFrameworkGroup(${this.id}).dispose(): disposing group`);
		this.instance.log("group", this.id, "dispose", "start");

		try {
			this.reset();
			await this.disposeHandler(this);
		} catch(e) {
			let error = parseException(e);
			this.disabled = true;
			this.button.classList.add("errored");
			this.button.disabled = true;
			this.instance.errored += 1;

			clog("ERRR", `TestFrameworkGroup(${this.id}).dispose(): an error occured while disposing group`, e);
			this.instance.log("group", this.id, "activate", "errored", error.code, error.description);
			return;
		}

		this.button.disabled = false;
		this.instance.log("group", this.id, "dispose", "complete");
	}

	async run() {
		if (this.disabled || this.isRunning)
			return false;

		this.instance.log("group", this.id, "run", "start");
		this.isRunning = true;
		this.button.classList.add("active");
		this.button.disabled = true;
		this.reset();

		for (let step of this.steps) {
			await delayAsync(this.instance.timeout);

			if (!await step.run())
				break;
		}

		this.button.disabled = false;
		this.button.classList.remove("active");
		this.isRunning = false;
		this.instance.log("group", this.id, "run", "complete");

		// Autoplay enabled
		if (this.instance.autoplay && !this.scene.isPlaying) {
			let index = this.scene.groups.indexOf(this);
			this.scene.run(index + 1);
		}
	}

	reset() {
		for (let step of this.steps)
			step.reset();
	}

	/**
	 * Add a new group
	 * @param	{TestFrameworkStepOptions}		options
	 * @return	{TestFrameworkStep}
	 */
	addStep(options) {
		let step = new TestFrameworkStep(this, options);
		this.steps.push(step);
		return step;
	}

	get field() {
		return this.scene.field;
	}

	get instance() {
		return this.scene.instance;
	}
}

/**
 * @typedef {{
 * 	name: String
 *	setup(step: TestFrameworkStep)
 *	run(step: TestFrameworkStep): Promise<Boolean>
 * }} TestFrameworkStepOptions
 */

class TestFrameworkStep {
	/**
	 * Construct a new step
	 * @param	{TestFrameworkGroup}			group
	 * @param	{TestFrameworkStepOptions}		options
	 */
	constructor(group, {
		name = "Sample Step",
		setup = () => {},
		run = () => {}
	} = {}) {
		this.group = group;
		this.setupHandler = setup;
		this.runHandler = run;
		this.failed = false;

		this.button = makeTree("button", ["tests-btn", "step"], {
			line: { tag: "span", class: "line" },
			nameValue: { tag: "span", class: "name" },
			detail: { tag: "span", class: "detail" }
		});

		this.button.addEventListener("click", () => this.run());
		this.name = name;
		this.status = "ready";
	}

	reset() {
		this.failed = false;
		this.status = "ready";
		this.detail = "";
		this.button.classList.remove("active");
		this.button.disabled = false;
	}

	async setup() {
		this.button.disabled = true;
		this.stepsNode.appendChild(this.button);
		await this.setupHandler(this);
		this.button.disabled = false;
	}

	/**
	 * Run this step!
	 * @return	{Promise<Boolean>}	step passed?
	 */
	async run() {
		this.reset();
		await nextFrameAsync();

		this.instance.log("step", this.name, "run", "start");
		this.status = "running";
		this.instance.total += 1;
		this.button.disabled = true;
		let result;

		let topPos = this.button.offsetTop - this.stepsNode.clientHeight + 100;
		if (this.stepsNode.scrollTop < topPos) {
			// Scroll to this step if off screen
			let maxScroll = this.stepsNode.scrollHeight - this.stepsNode.offsetHeight;
			this.instance.stepsScroll.scrollTo(Math.min(topPos + 300, maxScroll));
		}

		try {
			result = await this.runHandler(this);
		} catch(e) {
			this.failed = true;

			if (e instanceof AssertFailed) {
				this.status = "failed";
				this.instance.failed += 1;
				this.detail = e.toString();
				clog("ERRR", "TestFrameworkStep().run():", e.toString());
				this.instance.log("step", this.name, "run", "errored", e.toString());
			} else {
				let error = parseException(e);
				this.status = "broken";
				this.instance.broken += 1;
				clog("EXCP", `TestFrameworkStep().run(): test ${this.path} generated an exception!`, e);
				this.instance.log("step", this.name, "run", "broken", error.code, error.description);
				errorHandler(e);
			}
		}

		// Not failed yet, keep checking!
		if (!this.failed) {
			if (result === false) {
				this.failed = true;
				this.status = "failed";
				this.instance.failed += 1;
				clog("ERRR", `TestFrameworkStep().run(): test ${this.path} failed!`);
				this.instance.log("step", this.name, "run", "failed");
			} else if (result === this.SKIPPED) {
				this.failed = false;
				this.status = "skipped";
				this.instance.skipped += 1;
				clog("INFO", `TestFrameworkStep().run(): test ${this.path} skipped!`);
				this.instance.log("step", this.name, "run", "skipped");
			}
		}

		if (!this.failed && this.status === "running") {
			this.status = "passed";
			this.instance.passed += 1;
			clog("OKAY", `TestFrameworkStep().run(): test ${this.path} passed!`);
			this.instance.log("step", this.name, "run", "complete");
		}

		this.button.disabled = false;
		this.button.classList.add("active");
		return !this.failed;
	}

	get path() {
		return [
			this.group.scene.id,
			this.group.id
		].join(".") + ` -> "${this.name}"`;
	}

	get instance() {
		return this.group.scene.instance;
	}

	get stepsNode() {
		return this.instance.stepsNode;
	}

	/**
	 * Update step name
	 * @param	{String}	name
	 */
	set name(name) {
		this.button.nameValue.innerText = name;
	}

	get name() {
		return this.button.nameValue.innerText;
	}

	/**
	 * Update step detail
	 * @param	{String}	detail
	 */
	set detail(detail) {
		this.button.detail.innerText = detail;
	}

	get detail() {
		return this.button.detail.innerText;
	}

	/**
	 * Set step status
	 * @param {"ready" | "running" | "passed" | "failed" | "broken" | "skipped"}	status
	 */
	set status(status) {
		this.button.dataset.status = status;
	}

	/**
	 * Get step status
	 * @return {"ready" | "running" | "passed" | "failed" | "broken" | "skipped"}
	 */
	get status() {
		return this.button.dataset.status;
	}

	SKIPPED = "skipped";

	/**
	 * Assert Equal
	 * @param	{String}		what
	 * @param	{any}			which
	 * @param	{any}			equal
	 * @returns	{Boolean}
	 * @throws	{AssertFailed}
	 */
	AssertEqual(what, which, equal) {
		if (which == equal)
			return true;
		
		let message = (equal === "")
			? `${which} is not empty string`
			: `${which} != ${equal}`

		throw new AssertFailed("AssertEqual", what, message);
	}

	/**
	 * Assert Is
	 * @param	{String}		what
	 * @param	{Boolean}		which
	 * @returns	{Boolean}
	 * @throws	{AssertFailed}
	 */
	AssertIs(what, which) {
		if ((!!which) === true)
			return true;
		
		throw new AssertFailed("AssertIs", what, "is not satisfied");
	}

	/**
	 * Assert Is Not Null
	 * @param	{String}		what
	 * @param	{any}			which
	 * @returns	{Boolean}
	 * @throws	{AssertFailed}
	 */
	AssertNotNull(what, which) {
		if (which !== null)
			return true;
		
		throw new AssertFailed("AssertNotNull", what, "is null");
	}
}

class AssertFailed extends Error {
	constructor(type, what, message) {
		let msg = `${type}(): assert failed: \"${what}\" ${message}`;

		super(msg);
		this.fullMessage = msg;
		this.what = what;
	}

	toString() {
		return this.fullMessage;
	}
}