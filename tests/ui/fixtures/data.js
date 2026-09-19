export const seed = {
    "revision": 1,
    "session": {
        "name": "Мост у старой мельницы",
        "completed": false,
        "summaryReviewed": false,
        "saveFailed": false
    },
    "character": {
        "name": "Mira Vale",
        "className": "Следопыт",
        "level": 3,
        "origin": "Человек · проводница караванов",
        "appearance": "Короткие тёмные волосы, потёртый зелёный плащ, медный компас на шнурке.",
        "stats": [
            12,
            16,
            14,
            12,
            14,
            10
        ],
        "hp": 24,
        "maxHp": 28,
        "ac": 14,
        "speed": 30,
        "skills": [
            "Внимательность +4",
            "Выживание +4",
            "Скрытность +5",
            "Атлетика +3"
        ],
        "saves": [
            "Сила +3",
            "Ловкость +5"
        ],
        "resources": "Кости хитов: 2 / 3",
        "conditions": "Нет",
        "effects": "Нет",
        "inventory": [
            {
                "id": "i0",
                "name": "Длинный лук",
                "quantity": 1
            },
            {
                "id": "i1",
                "name": "Короткий меч",
                "quantity": 2
            },
            {
                "id": "i2",
                "name": "Дорожный набор",
                "quantity": 1
            },
            {
                "id": "i3",
                "name": "Фонарь",
                "quantity": 1
            }
        ],
        "features": "Исследователь болот — хорошо ориентируется на знакомой местности.\nМеткий стрелок — предпочитает дистанцию и укрытие.",
        "spellGroups": [
            {
                "level": 0,
                "remaining": 0,
                "total": 0,
                "names": []
            },
            {
                "level": 1,
                "remaining": 2,
                "total": 3,
                "names": [
                    "Лечение ран",
                    "Метка охотника",
                    "Опутывающий удар"
                ]
            },
            {
                "level": 2,
                "remaining": 0,
                "total": 0,
                "names": []
            }
        ]
    },
    "knowledge": {
        "world": [
            {
                "id": "f0",
                "text": "Каменный мост закрыт печатью городской стражи.",
                "status": "confirmed",
                "source": "Мастер, 12:01 и 12:04"
            },
            {
                "id": "f1",
                "text": "У старой мельницы горит свет.",
                "status": "confirmed",
                "source": "Мастер, 12:04"
            },
            {
                "id": "f2",
                "text": "Колокол у моста иногда звонит сам по себе.",
                "status": "rumor",
                "source": "Пересказ игрока, 12:05"
            }
        ],
        "persona": {
            "biography": "Мира водила небольшие караваны через северные болота. После исчезновения наставницы она собирает сведения о старых дорогах и людях, которые ещё ими пользуются.",
            "traits": "Наблюдательна. Перед действием задаёт один точный вопрос.",
            "ideals": "Сначала проверить сведения, потом рисковать чужой жизнью.",
            "bonds": "Хранит компас наставницы и отвечает за своих попутчиков.",
            "flaws": "Плохо переносит, когда обещания дают без намерения выполнить.",
            "goals": "Найти следы наставницы и безопасный путь через реку.",
            "voice": "Короткие спокойные фразы, конкретные предложения, без пафоса.",
            "relationships": "Ивен, владелец мельницы — пока незнаком; Мира обещала вернуть ему фонарь.",
            "facts": "Несколько лет работала проводницей. Хорошо знает болотные тропы, но не эту переправу."
        },
        "notes": "Уточнить у мастера, можно ли подойти к мельнице по берегу.\nПеред завершением сцены проверить, вернули ли фонарь.\nСлух о колоколе пока не подтверждён."
    },
    "summary": {
        "text": "Мира и её спутники остановились у закрытого стражей моста и ищут безопасную переправу. Мира слегка ранена, но может продолжать путь; она держит найденный фонарь и обещала вернуть его владельцу мельницы. Сейчас она предлагает поговорить с людьми у мельницы, где виден свет, и выяснить, где лодочник. История о самопроизвольном звоне колокола остаётся неподтверждённым слухом, поэтому Мира пока не строит на ней своих действий.",
        "through": "12:07",
        "validity": "current"
    },
    "participants": [
        {
            "id": "dm",
            "name": "Мастер",
            "role": "dm"
        },
        {
            "id": "player",
            "name": "Антон",
            "role": "player"
        },
        {
            "id": "agent",
            "name": "Mira Vale",
            "role": "agent"
        },
        {
            "id": "unknown",
            "name": "",
            "role": "unknown"
        }
    ],
    "transcript": [
        {
            "id": "u1",
            "time": "12:01",
            "speaker": "dm",
            "text": "К сумеркам вы доходите до каменного моста. На воротах висит свежая печать стражи.",
            "excluded": false
        },
        {
            "id": "u2",
            "time": "12:02",
            "speaker": "player",
            "text": "Я видел лодочника у мельницы. Может, он знает обход.",
            "excluded": false
        },
        {
            "id": "u3",
            "time": "12:03",
            "speaker": "agent",
            "text": "Я осмотрю печать, не касаясь её. Кто-нибудь узнаёт этот знак?",
            "excluded": false,
            "playback": "completed"
        },
        {
            "id": "u4",
            "time": "12:04",
            "speaker": "dm",
            "text": "Это знак городской стражи. У мельницы действительно горит свет.",
            "excluded": false
        },
        {
            "id": "u5",
            "time": "12:05",
            "speaker": "player",
            "text": "Говорят, колокол звонит сам по себе. Я не уверен, что это правда.",
            "excluded": false
        },
        {
            "id": "u6",
            "time": "12:06",
            "speaker": "dm",
            "text": "Стражник просит вернуть найденный фонарь владельцу мельницы.",
            "excluded": false
        },
        {
            "id": "u7",
            "time": "12:07",
            "speaker": "agent",
            "text": "Сначала поговорим у мельницы. Фонарь я верну, а слух о колоколе пока проверять не стану.",
            "excluded": false,
            "playback": "completed"
        }
    ],
    "response": {
        "phase": "idle"
    },
    "microphone": {
        "connected": true,
        "muted": false
    },
    "connectors": {
        "stt": {
            "adapter": "Demo STT",
            "endpoint": "https://stt.example.invalid",
            "model": "demo-transcribe",
            "project": "",
            "language": "ru",
            "availableAdapters": [
                "Demo STT",
                "Custom STT"
            ],
            "credentialConfigured": false,
            "connected": false
        },
        "llm": {
            "adapter": "Demo LLM",
            "endpoint": "https://llm.example.invalid",
            "model": "demo-response",
            "project": "",
            "availableAdapters": [
                "Demo LLM",
                "Custom LLM"
            ],
            "credentialConfigured": false,
            "connected": false
        },
        "tts": {
            "adapter": "Demo TTS",
            "endpoint": "https://tts.example.invalid",
            "model": "demo-speech",
            "project": "",
            "voice": "demo-voice",
            "availableAdapters": [
                "Demo TTS",
                "Custom TTS"
            ],
            "credentialConfigured": false,
            "connected": false
        }
    },
    "capabilities": {
        "requestTurn": true,
        "stopTurn": true,
        "microphone": true,
        "editUtterance": true,
        "assignSpeaker": true,
        "splitUtterance": true,
        "excludeUtterance": true,
        "editParticipant": true,
        "editCharacter": true,
        "changeInventory": true,
        "addItem": true,
        "editKnowledge": true,
        "editSummary": true,
        "configureConnector": true,
        "startSession": true,
        "openSession": true,
        "endSession": true,
        "exitAndSave": true,
        "retrySave": true,
        "deleteTranscript": true
    },
    "error": null,
    "diagnostics": {
        "total": 0.42,
        "lastTurn": 0.012,
        "budget": 20,
        "firstSpeech": 5.1,
        "estimated": true,
        "stages": [
            0.5,
            2.8,
            1.8
        ],
        "breakdown": [
            0.21,
            0.04,
            0.1,
            0.07
        ],
        "requests": [
            {
                "id": "demo-turn-07",
                "adapter": "Demo LLM",
                "seconds": 2.8,
                "cost": 0.004
            },
            {
                "id": "demo-speech-07",
                "adapter": "Demo TTS",
                "seconds": 1.8,
                "cost": 0.008
            },
            {
                "id": "demo-stt-06",
                "adapter": "Demo STT",
                "seconds": 0.5,
                "cost": 0.006
            }
        ]
    }
};
