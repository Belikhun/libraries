/**
 * /assets/tests/scenes/triangles.js
 * 
 * library's triangle background testing scene.
 * Scene will be loaded before tests framework and
 * wrapper for integration before scanning.
 * 
 * @author		Belikhun
 * @version		1.0
 * @license		MIT
 * @copyright	2018-2023 Belikhun
 */

/** @type {ScenesTree} */
tests.scenes.triangles = {
	name: "Triangle Background",
	classes: ["grid", "center", "dark"],

	main: {
		name: "Main Tests",

		store: {
			node: undefined,
			node2: undefined,

			/** @type {TriangleBackground} */
			instance: undefined,

			/** @type {TriangleBackground} */
			instanceBorder: undefined
		},

		setup(group) {
			this.store.node = document.createElement("span");
			this.store.node.style.width = "600px";
			this.store.node.style.height = "400px";

			this.store.node2 = document.createElement("span");
			this.store.node2.style.width = "600px";
			this.store.node2.style.height = "400px";

			this.store.instance = triBg(this.store.node);
			this.store.instanceBorder = triBg(this.store.node2, { style: "border" });

			group.field.append(this.store.node, this.store.node2);
		},

		"reset"() {
			this.store.instance.set({
				scale: 2,
				speed: 34,
				count: 38
			});

			this.store.instanceBorder.set({
				scale: 2,
				speed: 34,
				count: 38
			});

			this.store.instance.color = "gray";
			this.store.instanceBorder.color = "gray";
		},

		"50 triangles"() {
			this.store.instance.generate(50);
			this.store.instanceBorder.generate(50);
		},

		"100 triangles"() {
			this.store.instance.generate(100);
			this.store.instanceBorder.generate(100);
		},

		"200 triangles"() {
			this.store.instance.generate(200);
			this.store.instanceBorder.generate(200);
		},

		"color blue"() {
			this.store.instance.color = "blue";
			this.store.instanceBorder.color = "blue";
		},

		"color green"() {
			this.store.instance.color = "green";
			this.store.instanceBorder.color = "green";
		},

		"color red"() {
			this.store.instance.color = "red";
			this.store.instanceBorder.color = "red";
		},

		"scale 8"() {
			this.store.instance.scale = 8;
			this.store.instanceBorder.scale = 8;
		},

		"speed 50"() {
			this.store.instance.speed = 50;
			this.store.instanceBorder.speed = 50;
		}
	}
}