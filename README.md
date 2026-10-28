Yaad 🧠

No one deserves to forget. Everyone deserves to remember.

Yaad is a wearable-first, AI-powered memory assistant designed primarily for Meta smart glasses.

We forget where we put our keys. We leave our water bottles in classrooms. We meet people whose names we struggle to recall. We forget the little details that make everyday life meaningful.

What if you didn’t have to rely entirely on your memory?

Yaad aims to transform smart glasses into a personal memory companion that helps you remember your belongings, recall people, and retrieve meaningful details from your everyday experiences.

See it. Remember it. Never leave it behind.

⸻

💡 The Problem

Everyday forgetfulness is frustrating.

* 🔑 Where did I leave my keys?
* 🎧 Did I leave my earphones in the classroom?
* 🧴 Where did I last see my water bottle?
* 👤 What was that person’s name?
* 💬 What did we talk about when we last met?

Traditional reminder applications require users to anticipate what they might forget and manually create reminders.

But people don’t always realize they’re about to forget something.

The opportunity is to move beyond manually maintained lists and build a memory system that can capture relevant context, retrieve it when needed, and proactively help users avoid common mistakes.

⸻

🚀 Our Vision

Yaad aims to make memory assistance a natural part of everyday life through smart glasses.

Rather than requiring users to constantly open an application or type information into their phones, Yaad is designed around a wearable-first experience.

Through supported smart-glasses capabilities, contextual information, and AI-powered retrieval, Yaad aims to help users:

* Remember where their belongings were last seen.
* Receive timely reminders about potentially forgotten items.
* Recall names and relevant details about people.
* Retrieve contextual information using natural-language queries.
* Build a searchable record of useful everyday memories.

Our primary hardware target is Meta smart glasses, with the actual integration determined by available APIs, device permissions, and supported capabilities.

⸻

✨ Core Features

1. 📍 Belongings Memory — Our Primary USP

Helping people remember their belongings and avoid leaving them behind.

Yaad aims to build contextual memories around everyday objects.

Planned capabilities include:

* Visual memory: Capture relevant visual information through supported smart-glasses integrations.
* Last-seen history: Associate belongings with recorded locations and timestamps.
* Contextual retrieval: Retrieve relevant memories when users ask where an item was last seen.
* Proactive reminders: Explore ways to alert users when they may have left a previously observed item behind.
* Natural-language queries: Let users ask questions instead of searching through lists.

Example interaction

User: “Where did I leave my bottle?”

Yaad: “Your bottle was last recorded in your classroom at 2:15 PM.”

Illustrative example. Actual answers depend on captured data and the implemented memory system.

The goal is not merely to help users find lost belongings. It is to help them avoid leaving those belongings behind in the first place.

2. 👥 People Memory

People are an important part of our everyday memories.

Yaad aims to help users recall relevant information about the people they meet.

Planned capabilities include:

* Remembering names and user-provided details.
* Associating people with recorded interactions and contexts.
* Retrieving relevant notes from previous encounters.
* Helping users recall information before a subsequent interaction.

Example interaction

User: “Where did I meet Rahul?”

Yaad: “Your saved memory indicates that you met Rahul at the college hackathon.”

Illustrative example. This capability requires the relevant information to have been captured or recorded.

People Memory extends the same underlying memory system without replacing our primary focus on belongings.

3. 🧠 AI-Powered Memory Retrieval

Memory is most useful when you can retrieve the right information at the right time.

Yaad aims to support natural-language queries over stored memories.

Examples:

* “Where did I last see my wallet?”
* “When did I last use my headphones?”
* “What do I know about Rahul?”
* “What did I discuss with him last time?”

The memory engine will retrieve relevant records and use their associated context to construct useful answers.

4. 🔔 Contextual Reminders

Yaad aims to go beyond traditional time-based reminders.

Potential capabilities include:

* Detecting when a user leaves a previously recorded location.
* Checking whether belongings associated with that location may have been left behind.
* Delivering alerts through supported devices and integrations.
* Reducing unnecessary alerts by considering the available evidence.

Location signals alone cannot establish whether an object has been collected. Reliable reminders will require additional information or carefully designed confirmation logic.

⸻

🕶️ Why Smart Glasses?

Smart glasses offer a potentially useful interface for memory assistance because they can support hands-free interactions and, depending on the device and integration, capture visual context.

Yaad is designed around three principles:

1. Capture in context

Relevant information should be captured as naturally as possible, using supported device capabilities and appropriate user permissions.

2. Retrieve without friction

Users should be able to access relevant memories through hands-free interactions wherever the hardware and integration permit.

3. Assist before it’s too late

Yaad should aim to help users remember important belongings before they leave them behind, rather than relying exclusively on searches after something goes missing.

Meta smart glasses are our primary target platform. Other devices may be considered in the future, but the core experience will be designed around wearable-first memory assistance.

⸻

⚙️ How It Works

The intended system follows five stages.

1. Capture

Relevant visual or contextual information is captured through supported smart-glasses capabilities and authorized integrations.

2. Understand

AI processes the available information to identify potentially useful details, such as belongings, people, and contextual cues.

3. Store

The system saves appropriate memory records with relevant metadata, such as timestamps and available location information.

4. Retrieve

Users ask questions and receive answers based on their stored memories.

5. Assist

Yaad can use available context to generate reminders when there is sufficient evidence that an item may have been left behind.

Conceptual workflow:

Smart Glasses → Context Capture → AI Processing → Memory Storage → Retrieval & Reminders

This describes the intended architecture, not a claim that every component has already been implemented.

⸻

🏗️ Technology Stack

The final technology stack will be documented as implementation decisions are finalized.

The planned architecture may include:

Component	Purpose
Meta smart glasses	Primary target for wearable interaction and supported context capture
AI / computer vision	Interpret available visual information
Language model	Understand natural-language queries and formulate responses
Memory database	Store and retrieve contextual memory records
Backend services	Coordinate memory processing, retrieval, and integrations
Smartphone integration	Support configuration, notifications, and available device capabilities

Specific frameworks, APIs, and infrastructure will be added here once selected and implemented.

⸻

🔐 Privacy & Responsible Memory

A personal memory system must be built with privacy as a fundamental consideration.

Yaad aims to follow these principles:

* Capture information only through authorized and supported mechanisms.
* Provide appropriate controls over memory creation and retention.
* Protect stored memories using suitable security measures.
* Allow users to review and delete their stored memories.
* Handle information about other people responsibly.
* Avoid unnecessary collection of sensitive information.
* Respect applicable consent requirements and device permissions.

Any implementation involving visual capture or information about other people must account for privacy, consent, and the capabilities of the target platform.

⸻

🗺️ Roadmap

Phase 1 — Foundation

* Define the system architecture.
* Validate Meta smart-glasses integration options.
* Design the memory data model.
* Establish the initial development environment.

Phase 2 — Belongings Memory

* Implement memory creation and storage.
* Develop a workflow for recording belongings and their context.
* Associate memories with timestamps and available location data.
* Implement last-seen memory retrieval.

Phase 3 — AI Memory Retrieval

* Implement natural-language queries.
* Retrieve relevant memories using contextual information.
* Improve retrieval accuracy and response reliability.

Phase 4 — Proactive Assistance

* Investigate supported location and notification integrations.
* Develop logic for potentially forgotten belongings.
* Implement and test contextual reminders.

Phase 5 — People Memory

* Implement people-related memory records.
* Associate people with relevant user-provided context.
* Enable retrieval of previously stored interaction details.

Phase 6 — Testing & Deployment

* Test memory accuracy and reliability.
* Evaluate the end-to-end user experience.
* Implement appropriate privacy and security controls.
* Deploy a working prototype.

Roadmap items will be marked complete as the corresponding capabilities are implemented and tested.

⸻

🚧 Project Status

Status: In Development 🚀

Yaad is being developed as a hackathon project exploring wearable-first, AI-powered memory assistance.

Our initial priority is to establish the feasibility of the smart-glasses integration and build a reliable belongings-memory workflow before expanding into more advanced features.

⸻

🤝 Contributing

Suggestions, feedback, and contributions are welcome.

If you’d like to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Test your implementation.
5. Submit a pull request describing your contribution.

For significant changes, consider opening an issue first to discuss the proposed implementation.

⸻

🌟 The Bigger Picture

Technology has transformed how we communicate, work, and organize our lives.

Yet we still forget the small things: where we left our belongings, whom we met, and what made an interaction memorable.

Yaad aims to make these everyday memories easier to preserve and retrieve through wearable technology and AI.

We believe technology should not only help us do more. It should also help us remember what matters.

Yaad

Your memory, beyond your mind.

No one deserves to forget. Everyone deserves to remember.

⸻

📄 License

A license will be added once the project’s distribution and reuse terms have been decided.
