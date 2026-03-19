# Templates — Walking-Selfie-UGC


To be clear there are 3 master prompts and 3 applications (1 application for each master prompt)
The reason for the 3 different master prompts, is solely based on the users request in their prompt, if they say high angle use the high angle master prompt, if its a low angle with the camera pointed up towards the creator, so you’d essentially see their neck and chin and they have to look down to talk, and then 3rd is normal straight on chest level frame angle. The reason for this differentiation is they’re very different camera positioning so I wanted to make sure I had something prepared for each kind.

{
"template_name":"front_camera_conversational_walking_frame_master_v1_high_held",
"template_purpose":"Internal walking mode template for a downstream agent. This template is for a direct front camera conversational walking frame from a modern iPhone-like device using a higher handheld angle. It is designed to prevent photo-of-person-taking-selfie failure, prevent visible phone failure, prevent UI overlay failure, preserve natural realism, and keep the avatar very attractive, very fit, and fully believable.",
"priority_order":[
"true front camera capture overrides all pose and framing",
"direct front camera conversational walking frame overrides selfie-photo interpretations",
"reference identity only never composition",
"eyes must look at the camera lens in a natural organic way",
"natural realism over aesthetics",
"distinctly above average natural attractiveness without glamor",
"very fit healthy physique without exaggeration",
"real environment over cinematic environment",
"no visible phone in frame ever unless explicitly requested",
"no UI overlay or interface artifacts ever",
"no background people animals or sentient beings"
],
"core_output_identity":{
"absolute_rule":"Generate a direct front camera conversational walking frame from a modern iPhone like device.",
"camera_pov_rule":"The image is the phone front camera output itself, never an outside observer view.",
"shot_definition_rule":"Direct front camera walking conversational image only. Not a mirror shot, not a reflection shot, not a third person shot, not a photo of someone taking a photo, and not a screenshot of an app interface.",
"capture_truth_rule":"The image must read as an actual arm length front camera capture made by the subject while walking.",
"front_camera_geometry_rule":"Use true front camera geometry: close arm length distance, mild front camera wide angle behavior, upper torso dominant framing, slight handheld variance, and believable walking drift.",
"angle_rule":"This version uses a higher handheld angle with the camera slightly above eye level and angled down in a believable casual arm length front camera capture.",
"arm_rule":"The camera holding arm is implied from the camera side and normally remains off frame. The image must not look like a cameraman is filming the subject.",
"gaze_rule":"The subject's pupils and gaze must be directed toward the camera lens in a natural organic way, like a real person mid-walk glancing at the camera while talking. The eyes must not look down at the ground, at their feet, off into the distance, or away from the lens.",
"body_vs_gaze_rule":"The body can remain naturally in motion and not fully squared to camera, but the eyes must still meet the lens."
},
"hard_locks":{
"anti_glamor":[
"Never glamorize subject or environment.",
"No editorial, luxury, campaign, studio, influencer glam, glossy polish, or photoshoot styling.",
"No beauty-ad polish, fashion campaign polish, luxury lifestyle polish, or elevated commercial polish."
],
"natural_attractiveness":[
"Default to distinctly above average naturally very attractive people in a believable real world way.",
"Favor exceptional but believable facial harmony, healthy youthful vibrant features, clear healthy skin, bright alive eyes, naturally full lips, strong natural appeal, and a very good looking overall impression.",
"The subject should read as obviously attractive at first glance while still looking like a real person rather than a glamorized model.",
"Push attractiveness harder than average but keep it fully human and believable.",
"Minor blemishes and real skin variation are allowed for realism."
],
"fit_body_bias":[
"Default to a very fit healthy physique in a believable real world way.",
"Favor lean toned proportions, visible health, athletic femininity or athletic masculinity depending on the subject, and a strong overall impression of physical fitness.",
"The body should read as clearly fit, healthy, lean, and well kept without looking staged, exaggerated, bodybuilder extreme, or glamorized.",
"Push the healthy fit visual read harder than before while keeping it realistic."
],
"anti_front_camera_failure":[
"Never generate a mirror selfie.",
"Never generate an outside view of someone taking a selfie.",
"Never generate a photo of a person holding a phone visible toward the camera.",
"Never show the phone unless explicitly requested.",
"No mirror logic, reflection logic, third person capture logic, or fake selfie posture from an outside camera angle.",
"No second phone in the free hand.",
"No visible recording device in frame.",
"No implied second-camera filming logic."
],
"anti_ui_overlay":[
"Never generate UI overlay.",
"Never generate app buttons, icons, sidebars, menus, controls, interface chrome, camera interface elements, screenshot artifacts, watermark, or text overlay.",
"Do not make the image look like a screenshot from an app or browser."
],
"anti_pose":[
"No model pose, influencer pose, mirror pose, frozen aesthetic pose, or performative pretty pose.",
"Body language must feel casual, unforced, and like the subject is naturally talking while walking.",
"The subject should not look like they stopped to pose for the image."
],
"environment_realism":[
"Render the real life version of the requested setting.",
"The setting may be indoors or outdoors and must remain flexible unless user intent specifies otherwise.",
"No cinematic, showroom clean, studio built, designer staged, or unnaturally curated environments.",
"Allow believable clutter, ordinary imperfection, normal object placement, realistic wear, and normal day to day environmental irregularity when appropriate."
],
"background_exclusion":[
"There must be no people in the background.",
"There must be no animals in the background.",
"There must be no sentient beings or humanlike figures in the background.",
"Only the main avatar may appear in the image.",
"Background must be empty of bystanders, pedestrians, shoppers, coworkers, friends, strangers, pets, or passersby."
],
"walking_logic":[
"This is a handheld walking capture, not a static standing portrait.",
"Subtle handheld inconsistency, framing drift, and stride variation are allowed.",
"The image must feel like a freeze frame from a real person holding a phone while walking in a believable real world environment."
],
"high_angle_specific_locks":[
"The frame must clearly read as higher-held than neutral chest-level framing.",
"The camera should sit slightly above the eyes and angle down gently.",
"The perspective should not become overhead, extreme, or distorted.",
"The gaze must still meet the lens even with the higher-held angle."
]
},
"reference_handling":{
"primary_rule":"If there is a reference photo, use it only for facial identity and overall person resemblance. Ignore shot type, visible phone, mirror, framing, pose, hand position, arm position, composition, camera angle, walking angle, device visibility, and environment layout.",
"extract_only":[
"face shape",
"facial structure",
"approximate age",
"skin tone",
"hair color",
"hair texture",
"hair density",
"eye shape",
"brow shape",
"nose shape",
"lip shape",
"overall facial harmony",
"general vibe"
],
"ignore":[
"shot type",
"selfie logic",
"mirror logic",
"visible phone",
"phone case",
"hand position",
"arm position",
"pose",
"framing",
"crop logic",
"camera angle",
"reflection",
"background layout",
"scene staging",
"beauty styling",
"UI overlay",
"interface elements"
]
},
"avatar_block":{
"identity_features":"{{IDENTITY_FEATURES}}",
"hair_details":"{{HAIR_DETAILS}}",
"face_details":"{{FACE_DETAILS}}",
"skin_details":"{{SKIN_DETAILS}}",
"body_details":"{{BODY_DETAILS}}",
"outfit_details":"{{OUTFIT_DETAILS}}",
"vibe_details":"{{VIBE_DETAILS}}",
"subject_rule":"The subject must look like a real human in a casual direct front camera conversational walking moment and should default to being distinctly naturally attractive, very good looking, healthy, youthful, vibrant, visually appealing, and very fit without looking glamorized or artificially perfected.",
"realism_targets":[
"natural skin texture",
"clear healthy looking skin without airbrushing",
"minor asymmetry preserved",
"realistic under eye depth",
"subtle skin variation allowed",
"believable hair strands and flyaways",
"naturally full youthful lips with healthy natural color",
"bright alive eyes and facial features",
"exceptional but believable facial harmony",
"healthy youthful vitality",
"very fit lean toned but believable physique",
"small real life imperfections preserved",
"eyes directed at the camera lens",
"natural walking expression",
"real person attractiveness not polish"
],
"forbidden":[
"glamour face",
"beauty campaign face",
"hyper polished influencer face",
"airbrushed skin",
"plastic skin",
"CGI sheen",
"hyper symmetry correction",
"over sculpted facial planes",
"over sharpened jawline",
"cosmetic filter look",
"extreme bodybuilder look",
"unnaturally exaggerated physique",
"dead-eyed stare away from lens",
"downward gaze at feet"
]
},
"environment_block":{
"setting_details":"{{SETTING_DETAILS}}",
"environment_rule":"The environment must look like the real life version of the requested place as casually captured on a phone front camera while walking. It can be indoors or outdoors, but it must remain ordinary, believable, and empty of people and animals.",
"targets":[
"physically believable",
"naturally imperfect",
"lightly lived in when appropriate",
"ordinary object placement",
"real material textures",
"normal clutter when appropriate",
"ordinary indoor or outdoor walking logic",
"no background people",
"no background animals",
"no background sentient beings"
],
"forbidden":[
"cinematic staging",
"set design look",
"studio environment",
"showroom perfection",
"designer catalog composition",
"over curated decor",
"unrealistically beautiful background",
"background crowd",
"background pedestrian",
"background shopper",
"background coworker",
"background friend",
"background stranger",
"background animal",
"background pet",
"background human figure"
]
},
"body_language_and_expression":{
"core_rule":"The subject must feel like they are about to talk or already talking while walking, not like they are posing.",
"gaze_expression_rule":"The avatar should look at the camera with a natural organic glance, like a real person speaking while walking and briefly connecting with the lens.",
"allowed":[
"casual upright movement",
"subtle natural head angle",
"soft conversational attentiveness",
"mid thought",
"mid reaction",
"natural half smile",
"relaxed posture with believable tension",
"natural walking motion",
"organic eye contact with the lens"
],
"forbidden":[
"mirror selfie posture",
"phone holding pose with visible device",
"model pose",
"influencer pose",
"hip pop pose",
"arched posture",
"contrived flirt pose",
"beauty shot face",
"hard model stare",
"posed duck face",
"camera ready performative expression",
"eyes looking at feet",
"eyes looking far away from camera",
"body frozen like portrait session"
]
},
"camera_spec":{
"device_style":"modern iPhone front camera aesthetic",
"aspect_ratio":"9:16",
"flash":"off",
"camera_position":"slightly above eye level and angled down with slight natural handheld variance during walking",
"distance":"close arm length conversational distance consistent with true front camera use",
"framing":[
"head and upper torso dominant",
"chest up or upper torso crop",
"slight downward high-held crop",
"close enough for direct connection",
"natural smartphone framing",
"not stylized like portrait photography",
"not framed like a mirror selfie"
],
"lens_and_processing":[
"mild front camera wide angle behavior typical of a phone",
"subtle front camera foreshortening",
"subtle natural edge falloff",
"no exaggerated distortion",
"sharpest on eyes and central face",
"natural smartphone depth behavior",
"no portrait mode glamour blur",
"realistic smartphone HDR",
"light denoising",
"subtle smartphone sharpening",
"minor highlight compression",
"slight white balance inconsistency when natural",
"believable dynamic range"
],
"device_visibility_rule":"The phone must never be visible in frame unless explicitly requested.",
"ui_visibility_rule":"No camera UI, no app UI, no overlay, no browser controls, no screenshot framing, and no interface elements may appear."
},
"realism_and_lighting":{
"core_goal":"The image must look like a real organic phone capture of a real person in a real moment in a real place.",
"lighting_rule":"Lighting must feel natural, candid, and organic. Never glamorize through lighting, but allow a distinctly attractive, healthy, clear, vibrant, flattering real world appearance and a very fit healthy overall impression without losing realism.",
"allowed":[
"soft window light",
"ordinary indoor daylight",
"mixed natural room light",
"normal ambient home light",
"normal office light",
"normal hallway light",
"normal store light",
"natural overcast outdoor light",
"everyday exterior light",
"simple lamp light in real rooms"
],
"forbidden":[
"studio portrait lighting",
"beauty dish lighting",
"editorial glamour lighting",
"fashion campaign lighting",
"cinematic rim light",
"polished ad lighting",
"luxury polish",
"hyper clean aesthetic polish",
"studio realism",
"cinematic realism",
"commercial ad realism",
"perfect hero lighting"
]
},
"hard_negative_prompt":[
"mirror selfie",
"person taking a photo",
"photo of someone taking a photo",
"visible phone",
"phone in hand",
"phone covering face",
"second phone",
"phone held in free hand",
"mirror",
"reflection",
"bathroom mirror",
"mirror composition",
"third person shot",
"outside observer perspective",
"over the shoulder shot",
"tripod shot",
"camera visible",
"UI overlay",
"camera UI",
"browser UI",
"app interface",
"menu icons",
"buttons overlay",
"watermark",
"text overlay",
"screenshot artifacts",
"photoshoot pose",
"influencer pose",
"model pose",
"beauty campaign",
"fashion campaign",
"luxury aesthetic",
"glamour lighting",
"studio portrait",
"airbrushed skin",
"plastic skin",
"CGI sheen",
"hyper symmetry",
"synthetic hair",
"beauty filter",
"polished portrait",
"portrait mode glamour blur",
"DSLR look",
"cinematic bokeh",
"cinematic environment",
"studio indoors",
"studio outdoors",
"showroom room",
"designer catalog room",
"perfectly staged interior",
"over curated background",
"impossibly clean environment",
"background people",
"background crowd",
"background pedestrians",
"background shoppers",
"background coworkers",
"background friends",
"background strangers",
"background animals",
"background pets",
"eyes looking down",
"eyes looking at feet",
"gaze away from camera",
"cartoon",
"anime",
"illustration",
"painting",
"extra fingers",
"warped hands",
"deformed face"
],
"final_instruction_block":{
"non_negotiable_rules":[
"Never glamorize.",
"Never generate a mirror selfie.",
"Never generate an outside observer shot of someone taking a selfie.",
"Never show the phone unless explicitly requested.",
"Never show UI overlay, app UI, camera UI, screenshot artifacts, controls, or browser interface.",
"Never copy shot composition from reference images.",
"Always keep the image natural, organic, candid, conversational, and physically believable.",
"Always make the subject feel like they are about to talk or already talking while walking.",
"Always keep the camera as direct front camera output.",
"Always render the environment as a realistic real life version of the requested setting.",
"Default every avatar to distinctly above average natural attractiveness while keeping them realistic, non glamorized, and physically believable.",
"Default every avatar to a very fit, healthy, lean toned physique while keeping the body believable and not exaggerated.",
"Always keep the avatar's eyes directed toward the camera lens in a natural organic way.",
"Never include background people, background animals, or any other sentient beings.",
"Preserve the higher held slightly downward walking capture logic."
]
}
}

















APPLICATION 1
{
"template_name":"front_camera_conversational_walking_frame_final_v1_high_held_application",
"template_purpose":"Final merged prompt created from user intent plus master template. High-held direct front camera conversational walking frame.",
"source_user_intent":"make me a really attractive brunette girl walking and talking to the camera naturally like a casual phone video. maybe she’s walking outside by herself and it should feel super real.",
"resolved_intent_summary":"Create a very attractive naturally believable brunette woman in a direct front camera conversational walking frame with a higher-held slightly downward iPhone front-camera angle. She is walking alone in a casual outdoor environment, mid-conversation, very fit and healthy looking, eyes naturally glancing into the lens, no visible phone, no UI overlay, no background people or animals, and no glamorized polish.",
"priority_order":[
"true front camera capture overrides all pose and framing",
"direct front camera conversational walking frame overrides selfie-photo interpretations",
"user wants casual phone-video realism",
"user wants a very attractive brunette avatar",
"eyes must look at the camera lens in a natural organic way",
"natural realism over aesthetics",
"distinctly above average natural attractiveness without glamor",
"very fit healthy physique without exaggeration",
"real environment over cinematic environment",
"no visible phone in frame ever",
"no UI overlay or interface artifacts ever",
"no background people animals or sentient beings"
],
"core_output_identity":{
"absolute_rule":"Generate a direct front camera conversational walking frame from a modern iPhone like device.",
"camera_pov_rule":"The image is the phone front camera output itself, never an outside observer view.",
"shot_definition_rule":"Direct front camera walking conversational image only. Not a mirror shot, not a reflection shot, not a third person shot, not a photo of someone taking a photo, and not a screenshot of an app interface.",
"capture_truth_rule":"The image must read as an actual arm length front camera capture made by the subject while walking.",
"front_camera_geometry_rule":"Use true front camera geometry: close arm length distance, mild front camera wide angle behavior, upper torso dominant framing, slight handheld variance, and believable walking drift.",
"angle_rule":"Use a higher handheld angle with the camera slightly above eye level and angled down in a believable casual arm length front camera capture.",
"arm_rule":"The camera holding arm is implied from the camera side and normally remains off frame. The image must not look like a cameraman is filming the subject.",
"gaze_rule":"The subject's pupils and gaze must be directed toward the camera lens in a natural organic way, like a real person mid-walk glancing at the camera while talking."
},
"avatar_block":{
"identity_features":"young adult brunette woman, distinctly very attractive, believable real person, strong natural appeal",
"hair_details":"medium to long brunette hair with natural texture, realistic strands, a few flyaways, healthy and believable",
"face_details":"exceptional but believable facial harmony, healthy youthful features, bright alive eyes, naturally full lips, soft real-world beauty",
"skin_details":"clear healthy skin with natural texture and subtle real variation, no airbrushing",
"body_details":"very fit healthy lean toned but believable physique, visually attractive but not exaggerated",
"outfit_details":"casual everyday outfit suitable for a solo walk, attractive but not glamorized, ordinary and believable",
"vibe_details":"casual phone-video realism, super real, alone, mid-conversation, natural confidence, no posing",
"subject_rule":"The subject must look like a real human in a casual direct front camera conversational walking moment and should default to being distinctly naturally attractive, very good looking, healthy, youthful, vibrant, visually appealing, and very fit without looking glamorized or artificially perfected.",
"realism_targets":[
"natural skin texture",
"clear healthy looking skin without airbrushing",
"minor asymmetry preserved",
"realistic under eye depth",
"subtle skin variation allowed",
"believable hair strands and flyaways",
"naturally full youthful lips with healthy natural color",
"bright alive eyes and facial features",
"exceptional but believable facial harmony",
"healthy youthful vitality",
"very fit lean toned but believable physique",
"small real life imperfections preserved",
"eyes directed at the camera lens",
"natural walking expression"
],
"forbidden":[
"glamour face",
"beauty campaign face",
"hyper polished influencer face",
"airbrushed skin",
"plastic skin",
"CGI sheen",
"cosmetic filter look",
"extreme bodybuilder look",
"unnaturally exaggerated physique",
"eyes looking down"
]
},
"environment_block":{
"setting_details":"ordinary believable outdoor walking environment, casual, empty of other people and animals",
"environment_rule":"The environment must look like the real life version of an everyday outdoor place as casually captured on a phone front camera while walking. It must remain ordinary, believable, and empty of people and animals.",
"targets":[
"physically believable",
"naturally imperfect",
"real material textures",
"ordinary outdoor walking logic",
"quiet solo walking feel",
"no background people",
"no background animals",
"no background sentient beings"
],
"forbidden":[
"cinematic staging",
"travel ad look",
"studio outdoor look",
"luxury neighborhood polish",
"background crowd",
"background pedestrian",
"background friend",
"background animal"
]
},
"body_language_and_expression":{
"core_rule":"The subject must feel like she is already talking while walking, not like she is posing.",
"gaze_expression_rule":"Her eyes must connect naturally with the lens, like a real person talking to their phone while walking.",
"allowed":[
"casual upright movement",
"soft conversational attentiveness",
"mid sentence",
"natural half smile",
"subtle natural head angle",
"organic eye contact with the lens",
"relaxed posture with believable tension"
],
"forbidden":[
"model pose",
"influencer pose",
"beauty shot face",
"hard model stare",
"posed duck face",
"eyes looking far away",
"eyes looking at feet"
]
},
"camera_spec":{
"device_style":"modern iPhone front camera aesthetic",
"aspect_ratio":"9:16",
"flash":"off",
"camera_position":"slightly above eye level and angled down with slight natural handheld variance during walking",
"distance":"close arm length conversational distance consistent with true front camera use",
"framing":[
"head and upper torso dominant",
"chest up or upper torso crop",
"slight downward high-held crop",
"close enough for direct connection",
"natural smartphone framing"
],
"lens_and_processing":[
"mild front camera wide angle behavior typical of a phone",
"subtle front camera foreshortening",
"subtle natural edge falloff",
"sharpest on eyes and central face",
"natural smartphone depth behavior",
"realistic smartphone HDR",
"light denoising",
"subtle smartphone sharpening",
"believable dynamic range"
],
"device_visibility_rule":"The phone must never be visible in frame.",
"ui_visibility_rule":"No UI overlay, no app interface, no browser controls, and no screenshot artifacts may appear."
},
"realism_and_lighting":{
"core_goal":"The image must look like a real organic phone capture of a real person in a real outdoor place.",
"lighting_rule":"Lighting must feel natural, candid, and organic. Never glamorize through lighting, but allow an attractive healthy real-world appearance without losing realism.",
"allowed":[
"natural daylight",
"soft outdoor daylight",
"mild overcast light",
"open shade",
"ordinary sunny light",
"real front camera auto exposure behavior"
],
"forbidden":[
"studio portrait lighting",
"editorial glamour lighting",
"fashion campaign lighting",
"cinematic lighting",
"polished ad lighting"
]
},
"hard_negative_prompt":[
"visible phone",
"phone in hand",
"second phone",
"UI overlay",
"camera UI",
"browser UI",
"app interface",
"watermark",
"text overlay",
"mirror selfie",
"third person shot",
"beauty campaign",
"glamour lighting",
"airbrushed skin",
"background people",
"background pedestrians",
"background animals",
"eyes looking down",
"cartoon",
"anime"
],
"final_instruction_block":{
"non_negotiable_rules":[
"Never show a phone in frame.",
"Never show UI overlay or interface artifacts.",
"Always keep the eyes naturally directed at the lens.",
"Never include background people or animals.",
"Keep the brunette avatar very attractive, very fit, and fully believable.",
"Preserve the higher held slightly downward walking capture logic."
]
}
}
















MASTER 2:
{
"template_name":"front_camera_conversational_walking_frame_master_v1_neutral_arm_length",
"template_purpose":"Internal walking mode template for a downstream agent. This template is for a neutral arm-length direct front camera conversational walking frame from a modern iPhone-like device. It is designed to preserve natural realism, no visible phone, no UI overlay, stronger beauty and fitness defaults, natural lens eye contact, and a true handheld front-camera feel without drifting into third-person filming logic.",
"priority_order":[
"true front camera capture overrides all pose and framing",
"direct front camera conversational walking frame overrides selfie-photo interpretations",
"reference identity only never composition",
"eyes must look at the camera lens in a natural organic way",
"natural realism over aesthetics",
"distinctly above average natural attractiveness without glamor",
"very fit healthy physique without exaggeration",
"real environment over cinematic environment",
"no visible phone in frame ever unless explicitly requested",
"no UI overlay or interface artifacts ever",
"no background people animals or sentient beings"
],
"core_output_identity":{
"absolute_rule":"Generate a direct front camera conversational walking frame from a modern iPhone like device.",
"camera_pov_rule":"The image is the phone front camera output itself, never an outside observer view.",
"shot_definition_rule":"Direct front camera walking conversational image only. Not a mirror shot, not a reflection shot, not a third person shot, not a photo of someone taking a photo, and not a screenshot of an app interface.",
"capture_truth_rule":"The image must read as an actual arm length front camera capture made by the subject while walking.",
"front_camera_geometry_rule":"Use true front camera geometry: close arm length distance, mild front camera wide angle behavior, upper torso dominant framing, slight handheld variance, and believable walking drift.",
"angle_rule":"This version uses a neutral arm-length front camera angle roughly around face to upper chest level with direct forward handheld framing.",
"arm_rule":"The camera holding arm is implied from the camera side and normally remains off frame. The image must not feel like an invisible cameraman is walking in front of the subject.",
"gaze_rule":"The subject's pupils and gaze must be directed toward the camera lens in a natural organic way, like a real person mid-walk briefly connecting with the lens while speaking.",
"body_vs_gaze_rule":"The body remains naturally in motion and does not need to be fully squared to the lens, but the eyes must still connect to the camera."
},
"hard_locks":{
"anti_glamor":[
"Never glamorize subject or environment.",
"No editorial, luxury, campaign, studio, influencer glam, glossy polish, or photoshoot styling.",
"No polished commercial ad feeling, no elevated fashion mood, and no beauty-campaign treatment."
],
"natural_attractiveness":[
"Default to distinctly above average naturally very attractive people in a believable real world way.",
"Favor exceptional but believable facial harmony, healthy youthful vibrant features, clear healthy skin, bright alive eyes, naturally full lips, strong natural appeal, and a very good looking overall impression.",
"The subject should read as obviously attractive at first glance while still looking like a real person rather than a glamorized model.",
"Push attractiveness harder than before while keeping it natural and non-polished.",
"Minor blemishes and real skin variation are allowed for realism."
],
"fit_body_bias":[
"Default to a very fit healthy physique in a believable real world way.",
"Favor lean toned proportions, visible health, athletic femininity or athletic masculinity depending on the subject, and a strong overall impression of physical fitness.",
"The body should read as clearly fit, healthy, lean, and well kept without looking staged, exaggerated, bodybuilder extreme, or glamorized."
],
"anti_front_camera_failure":[
"Never generate a mirror selfie.",
"Never generate an outside view of someone taking a selfie.",
"Never generate a photo of a person visibly holding a phone toward the camera.",
"Never show the phone unless explicitly requested.",
"No mirror logic, reflection logic, third person capture logic, or fake selfie posture from an outside camera angle.",
"No second phone in the non-camera hand.",
"No visible recording device in frame."
],
"anti_ui_overlay":[
"Never generate UI overlay.",
"Never generate app buttons, icons, sidebars, menus, controls, interface chrome, camera interface elements, screenshot artifacts, watermark, or text overlay.",
"Do not make the image look like a screenshot from software."
],
"anti_pose":[
"No model pose, influencer pose, mirror pose, frozen aesthetic pose, or performative pretty pose.",
"Body language must feel casual, unforced, and like the subject is naturally talking while walking."
],
"environment_realism":[
"Render the real life version of the requested setting.",
"The setting may be indoors or outdoors and must remain flexible unless user intent specifies otherwise.",
"No cinematic, showroom clean, studio built, designer staged, or unnaturally curated environments.",
"Allow believable clutter, ordinary imperfection, normal object placement, realistic wear, and normal day to day environmental irregularity when appropriate."
],
"background_exclusion":[
"There must be no people in the background.",
"There must be no animals in the background.",
"There must be no sentient beings or humanlike figures in the background.",
"Only the main avatar may appear in the image."
],
"walking_logic":[
"This is a handheld walking capture, not a static standing portrait.",
"The framing should feel like a normal social video while the subject is moving and talking.",
"Subtle handheld inconsistency, stride bounce, and mild framing drift are allowed."
],
"neutral_angle_specific_locks":[
"The frame must clearly read as neutral arm-length front camera capture rather than high-held or low-held.",
"The perspective should feel straightforward, conversational, and direct.",
"The gaze must still meet the lens even while the body remains naturally in motion."
]
},
"reference_handling":{
"primary_rule":"If there is a reference photo, use it only for facial identity and overall person resemblance. Ignore shot type, visible phone, mirror, framing, pose, hand position, arm position, composition, camera angle, walking angle, device visibility, and environment layout.",
"extract_only":[
"face shape",
"facial structure",
"approximate age",
"skin tone",
"hair color",
"hair texture",
"hair density",
"eye shape",
"brow shape",
"nose shape",
"lip shape",
"overall facial harmony",
"general vibe"
],
"ignore":[
"shot type",
"selfie logic",
"mirror logic",
"visible phone",
"phone case",
"hand position",
"arm position",
"pose",
"framing",
"crop logic",
"camera angle",
"reflection",
"background layout",
"scene staging",
"beauty styling",
"UI overlay",
"interface elements"
]
},
"avatar_block":{
"identity_features":"{{IDENTITY_FEATURES}}",
"hair_details":"{{HAIR_DETAILS}}",
"face_details":"{{FACE_DETAILS}}",
"skin_details":"{{SKIN_DETAILS}}",
"body_details":"{{BODY_DETAILS}}",
"outfit_details":"{{OUTFIT_DETAILS}}",
"vibe_details":"{{VIBE_DETAILS}}",
"subject_rule":"The subject must look like a real human in a casual direct front camera conversational walking moment and should default to being distinctly naturally attractive, very good looking, healthy, youthful, vibrant, visually appealing, and very fit without looking glamorized or artificially perfected.",
"realism_targets":[
"natural skin texture",
"clear healthy looking skin without airbrushing",
"minor asymmetry preserved",
"realistic under eye depth",
"subtle skin variation allowed",
"believable hair strands and flyaways",
"naturally full youthful lips with healthy natural color",
"bright alive eyes and facial features",
"exceptional but believable facial harmony",
"healthy youthful vitality",
"very fit lean toned but believable physique",
"small real life imperfections preserved",
"eyes directed at the camera lens",
"natural conversational walking expression"
],
"forbidden":[
"glamour face",
"beauty campaign face",
"hyper polished influencer face",
"airbrushed skin",
"plastic skin",
"CGI sheen",
"hyper symmetry correction",
"over sculpted facial planes",
"over sharpened jawline",
"cosmetic filter look",
"extreme bodybuilder look",
"unnaturally exaggerated physique",
"dead gaze away from lens",
"downward gaze at feet"
]
},
"environment_block":{
"setting_details":"{{SETTING_DETAILS}}",
"environment_rule":"The environment must look like the real life version of the requested place as casually captured on a phone front camera while walking. It can be indoors or outdoors, but it must remain ordinary, believable, and empty of people and animals.",
"targets":[
"physically believable",
"naturally imperfect",
"lightly lived in when appropriate",
"ordinary object placement",
"real material textures",
"normal clutter when appropriate",
"ordinary indoor or outdoor walking logic",
"no background people",
"no background animals",
"no background sentient beings"
],
"forbidden":[
"cinematic staging",
"set design look",
"studio environment",
"showroom perfection",
"designer catalog composition",
"over curated decor",
"unrealistically beautiful background",
"background crowd",
"background pedestrian",
"background shopper",
"background coworker",
"background friend",
"background stranger",
"background animal",
"background pet",
"background human figure"
]
},
"body_language_and_expression":{
"core_rule":"The subject must feel like they are about to talk or already talking while walking, not like they are posing.",
"gaze_expression_rule":"The avatar should look at the camera with a natural organic glance, like a real person casually speaking while walking.",
"allowed":[
"casual upright walking posture",
"subtle natural head angle",
"soft conversational attentiveness",
"mid thought",
"mid reaction",
"natural half smile",
"relaxed posture with believable tension",
"natural walking motion",
"organic eye contact with the lens"
],
"forbidden":[
"mirror selfie posture",
"phone holding pose with visible device",
"model pose",
"influencer pose",
"hip pop pose",
"arched posture",
"contrived flirt pose",
"beauty shot face",
"hard model stare",
"posed duck face",
"camera ready performative expression",
"eyes looking at feet",
"eyes looking far from lens"
]
},
"camera_spec":{
"device_style":"modern iPhone front camera aesthetic",
"aspect_ratio":"9:16",
"flash":"off",
"camera_position":"roughly face to upper chest level with direct forward handheld variance during walking",
"distance":"close arm length conversational distance consistent with true front camera use",
"framing":[
"head and upper torso dominant",
"chest up or upper torso crop",
"neutral direct crop",
"close enough for direct connection",
"natural smartphone framing",
"not stylized like portrait photography",
"not framed like a mirror selfie"
],
"lens_and_processing":[
"mild front camera wide angle behavior typical of a phone",
"subtle front camera foreshortening",
"subtle natural edge falloff",
"no exaggerated distortion",
"sharpest on eyes and central face",
"natural smartphone depth behavior",
"no portrait mode glamour blur",
"realistic smartphone HDR",
"light denoising",
"subtle smartphone sharpening",
"minor highlight compression",
"slight white balance inconsistency when natural",
"believable dynamic range"
],
"device_visibility_rule":"The phone must never be visible in frame unless explicitly requested.",
"ui_visibility_rule":"No camera UI, no app UI, no overlay, no browser controls, no screenshot framing, and no interface elements may appear."
},
"realism_and_lighting":{
"core_goal":"The image must look like a real organic phone capture of a real person in a real moment in a real place.",
"lighting_rule":"Lighting must feel natural, candid, and organic. Never glamorize through lighting, but allow a distinctly attractive, healthy, clear, vibrant, flattering real world appearance and a very fit healthy overall impression without losing realism.",
"allowed":[
"soft window light",
"ordinary indoor daylight",
"mixed natural room light",
"normal ambient home light",
"normal office light",
"normal hallway light",
"normal dorm light",
"normal store light",
"natural overcast outdoor light",
"everyday exterior light"
],
"forbidden":[
"studio portrait lighting",
"beauty dish lighting",
"editorial glamour lighting",
"fashion campaign lighting",
"cinematic rim light",
"polished ad lighting",
"luxury polish",
"hyper clean aesthetic polish",
"studio realism",
"cinematic realism",
"commercial ad realism",
"perfect studio-clean lighting"
]
},
"hard_negative_prompt":[
"mirror selfie",
"person taking a photo",
"photo of someone taking a photo",
"visible phone",
"phone in hand",
"phone covering face",
"second phone",
"phone held in free hand",
"mirror",
"reflection",
"bathroom mirror",
"mirror composition",
"third person shot",
"outside observer perspective",
"over the shoulder shot",
"tripod shot",
"camera visible",
"UI overlay",
"camera UI",
"browser UI",
"app interface",
"menu icons",
"buttons overlay",
"watermark",
"text overlay",
"screenshot artifacts",
"photoshoot pose",
"influencer pose",
"model pose",
"beauty campaign",
"fashion campaign",
"luxury aesthetic",
"glamour lighting",
"studio portrait",
"airbrushed skin",
"plastic skin",
"CGI sheen",
"hyper symmetry",
"synthetic hair",
"beauty filter",
"polished portrait",
"portrait mode glamour blur",
"DSLR look",
"cinematic bokeh",
"cinematic environment",
"studio indoors",
"studio outdoors",
"showroom room",
"designer catalog room",
"perfectly staged interior",
"over curated background",
"impossibly clean environment",
"background people",
"background crowd",
"background pedestrians",
"background shoppers",
"background coworkers",
"background friends",
"background strangers",
"background animals",
"background pets",
"eyes looking down",
"eyes looking at feet",
"gaze away from camera",
"cartoon",
"anime",
"illustration",
"painting",
"extra fingers",
"warped hands",
"deformed face"
],
"final_instruction_block":{
"non_negotiable_rules":[
"Never glamorize.",
"Never generate a mirror selfie.",
"Never generate an outside observer shot of someone taking a selfie.",
"Never show the phone unless explicitly requested.",
"Never show UI overlay, app UI, camera UI, screenshot artifacts, controls, or browser interface.",
"Never copy shot composition from reference images.",
"Always keep the image natural, organic, candid, conversational, and physically believable.",
"Always make the subject feel like they are about to talk or already talking while walking.",
"Always keep the camera as direct front camera output.",
"Always render the environment as a realistic real life version of the requested setting.",
"Default every avatar to distinctly above average natural attractiveness while keeping them realistic, non glamorized, and physically believable.",
"Default every avatar to a very fit, healthy, lean toned physique while keeping the body believable and not exaggerated.",
"Always keep the avatar's eyes directed toward the camera lens in a natural organic way.",
"Never include background people, background animals, or any other sentient beings.",
"Preserve the neutral arm-length conversational walking capture logic."
]
}
}














Application 2:
{
"template_name":"front_camera_conversational_walking_frame_final_v1_neutral_arm_length_application",
"template_purpose":"Final merged prompt created from user intent plus master template. Neutral arm-length direct front camera conversational walking frame.",
"source_user_intent":"make a really pretty girl walking through an apartment hallway talking to the camera like a normal casual phone video. make her look fit and real and not polished.",
"resolved_intent_summary":"Create a very attractive naturally believable fit young woman in a direct front camera conversational walking frame with a neutral arm-length iPhone front-camera angle. She is walking through an apartment hallway while talking, eyes naturally connecting with the lens, no visible phone, no UI overlay, no background people or animals, no studio polish, and no glamorized look.",
"priority_order":[
"true front camera capture overrides all pose and framing",
"direct front camera conversational walking frame overrides selfie-photo interpretations",
"user wants apartment hallway realism",
"user wants a really pretty fit avatar",
"eyes must look at the camera lens in a natural organic way",
"natural realism over aesthetics",
"distinctly above average natural attractiveness without glamor",
"very fit healthy physique without exaggeration",
"no visible phone in frame ever",
"no UI overlay or interface artifacts ever",
"no background people animals or sentient beings"
],
"core_output_identity":{
"absolute_rule":"Generate a direct front camera conversational walking frame from a modern iPhone like device.",
"camera_pov_rule":"The image is the phone front camera output itself, never an outside observer view.",
"shot_definition_rule":"Direct front camera walking conversational image only. Not a mirror shot, reflection shot, third person shot, photo of someone taking a photo, or screenshot of an interface.",
"capture_truth_rule":"The image must read as an actual arm length front camera capture made by the subject while walking.",
"front_camera_geometry_rule":"Use true front camera geometry: close arm length distance, mild front camera wide angle behavior, upper torso dominant framing, slight handheld variance, and believable walking drift.",
"angle_rule":"Use a neutral arm-length front camera angle around face to upper chest level with direct forward handheld framing.",
"arm_rule":"The camera holding arm is implied from the camera side and normally remains off frame.",
"gaze_rule":"The subject's pupils and gaze must be directed toward the camera lens in a natural organic way."
},
"avatar_block":{
"identity_features":"young adult woman, very attractive, fit, believable real person",
"hair_details":"natural everyday hair, healthy, believable strands, not glam styled",
"face_details":"very pretty but natural facial harmony, healthy youthful features, bright eyes, natural lips, soft real-world attractiveness",
"skin_details":"clear healthy skin with natural texture and subtle real variation",
"body_details":"very fit healthy lean toned but believable physique",
"outfit_details":"casual everyday outfit suitable for walking in an apartment hallway, attractive but ordinary",
"vibe_details":"normal casual phone-video realism, mid-conversation, relaxed, non-performative, real",
"subject_rule":"The subject must look like a real human in a casual direct front camera conversational walking moment and should default to being distinctly naturally attractive, very good looking, healthy, youthful, vibrant, visually appealing, and very fit without looking glamorized or artificially perfected.",
"realism_targets":[
"natural skin texture",
"clear healthy looking skin without airbrushing",
"minor asymmetry preserved",
"realistic under eye depth",
"subtle skin variation allowed",
"believable hair strands and flyaways",
"naturally full youthful lips with healthy natural color",
"bright alive eyes and facial features",
"exceptional but believable facial harmony",
"healthy youthful vitality",
"very fit lean toned but believable physique",
"small real life imperfections preserved",
"eyes directed at the camera lens",
"natural conversational walking expression"
],
"forbidden":[
"glamour face",
"beauty campaign face",
"hyper polished influencer face",
"airbrushed skin",
"plastic skin",
"cosmetic filter look",
"extreme bodybuilder look",
"unnaturally exaggerated physique",
"eyes looking down"
]
},
"environment_block":{
"setting_details":"believable apartment hallway environment, ordinary and lightly lived in, empty of people and animals",
"environment_rule":"The environment must look like a real apartment hallway captured casually on a phone front camera while walking. It must remain ordinary, believable, and empty of people and animals.",
"targets":[
"physically believable hallway proportions",
"ordinary doors walls floors and lighting",
"naturally imperfect surfaces",
"real material textures",
"no background people",
"no background animals",
"no background sentient beings"
],
"forbidden":[
"luxury showroom hallway",
"cinematic hallway",
"designer-staged hallway",
"background residents",
"background strangers",
"background pets",
"unrealistically perfect corridor"
]
},
"body_language_and_expression":{
"core_rule":"The subject must feel like she is already talking while walking, not posing.",
"gaze_expression_rule":"The avatar should look at the camera with a natural organic glance, like a real person speaking while walking down a hallway.",
"allowed":[
"casual upright walking posture",
"subtle natural head angle",
"soft conversational attentiveness",
"mid sentence",
"mid reaction",
"natural half smile",
"relaxed posture with believable tension",
"organic eye contact with the lens"
],
"forbidden":[
"model pose",
"influencer pose",
"beauty shot face",
"hard model stare",
"camera ready performative expression",
"eyes looking at feet",
"gaze away from camera"
]
},
"camera_spec":{
"device_style":"modern iPhone front camera aesthetic",
"aspect_ratio":"9:16",
"flash":"off",
"camera_position":"roughly face to upper chest level with direct forward handheld variance during walking",
"distance":"close arm length conversational distance consistent with true front camera use",
"framing":[
"head and upper torso dominant",
"neutral direct crop",
"close enough for direct connection",
"natural smartphone framing"
],
"lens_and_processing":[
"mild front camera wide angle behavior typical of a phone",
"subtle front camera foreshortening",
"sharpest on eyes and central face",
"realistic smartphone HDR",
"light denoising",
"subtle smartphone sharpening",
"believable dynamic range"
],
"device_visibility_rule":"The phone must never be visible in frame.",
"ui_visibility_rule":"No UI overlay, no app interface, no browser controls, and no screenshot artifacts may appear."
},
"realism_and_lighting":{
"core_goal":"The image must look like a real organic phone capture of a real person in a real apartment hallway.",
"lighting_rule":"Lighting must feel natural, candid, and ordinary. Never glamorize through lighting.",
"allowed":[
"normal indoor ambient light",
"ordinary hallway light",
"soft daylight spill when natural",
"real front camera auto exposure behavior"
],
"forbidden":[
"studio portrait lighting",
"editorial glamour lighting",
"cinematic lighting",
"polished ad lighting"
]
},
"hard_negative_prompt":[
"visible phone",
"phone in hand",
"second phone",
"UI overlay",
"camera UI",
"browser UI",
"app interface",
"watermark",
"text overlay",
"mirror selfie",
"third person shot",
"beauty campaign",
"glamour lighting",
"airbrushed skin",
"background residents",
"background people",
"background animals",
"eyes looking down",
"cartoon",
"anime"
],
"final_instruction_block":{
"non_negotiable_rules":[
"Never show a phone in frame.",
"Never show UI overlay or interface artifacts.",
"Always keep the eyes naturally directed at the lens.",
"Never include background people or animals.",
"Keep the apartment hallway ordinary and believable.",
"Make the avatar very attractive, very fit, and fully believable.",
"Preserve the neutral arm-length conversational walking capture logic."
]
}
}










Master 3:
{
"template_name":"front_camera_conversational_walking_frame_master_v1_low_held_upward",
"template_purpose":"Internal walking mode template for a downstream agent. This template is for a low-held upward direct front camera conversational walking frame from a modern iPhone-like device. It is specifically redesigned to fix low-angle misinterpretation failures, including downward gaze, face pointed toward the ground, missing handheld logic, visible phone errors, and UI overlay errors. It preserves natural realism, stronger attractiveness and fitness defaults, and true arm-length front-camera capture logic.",
"priority_order":[
"true front camera capture overrides all pose and framing",
"direct front camera conversational walking frame overrides selfie-photo interpretations",
"low-held upward capture geometry must be preserved correctly",
"reference identity only never composition",
"eyes must look at the camera lens in a natural organic way",
"natural realism over aesthetics",
"distinctly above average natural attractiveness without glamor",
"very fit healthy physique without exaggeration",
"real environment over cinematic environment",
"no visible phone in frame ever unless explicitly requested",
"no UI overlay or interface artifacts ever",
"no background people animals or sentient beings"
],
"core_output_identity":{
"absolute_rule":"Generate a direct front camera conversational walking frame from a modern iPhone like device.",
"camera_pov_rule":"The image is the phone front camera output itself, never an outside observer view.",
"shot_definition_rule":"Direct front camera walking conversational image only. Not a mirror shot, not a reflection shot, not a third person shot, not a photo of someone taking a photo, and not a screenshot of an app interface.",
"capture_truth_rule":"The image must read as an actual arm length front camera capture made by the subject while walking.",
"front_camera_geometry_rule":"Use true front camera geometry: close arm length distance, mild front camera wide angle behavior, upper torso dominant framing, slight handheld variance, believable walking drift, and a lower-held upward camera relationship that still preserves connection to the face.",
"angle_rule":"This version uses a lower-held upward angle with the camera below face level and angled upward in a believable casual arm-length front camera capture.",
"arm_rule":"The camera holding arm is implied from the lower camera side and normally remains off frame. The frame must still read as self-captured handheld front camera output, not as if another person or a floating camera is filming the subject.",
"gaze_rule":"The subject's pupils and gaze must be directed toward the camera lens in a natural organic way, like a real person mid-walk briefly glancing into a lower-held front camera while talking.",
"anti_low_angle_failure_rule":"The avatar must not look down at their feet, must not tuck the chin into the chest, must not direct the face toward the floor, and must not behave like the camera is near the knees. The low-held upward angle must still preserve attractive facial visibility, eye contact, and conversational closeness.",
"body_vs_gaze_rule":"The body can remain naturally in motion and not fully squared to camera, but the eyes must still connect to the camera lens."
},
"hard_locks":{
"anti_glamor":[
"Never glamorize subject or environment.",
"No editorial, luxury, campaign, studio, influencer glam, glossy polish, or photoshoot styling.",
"No polished fitness campaign look, no luxury activewear campaign look, and no elevated commercial treatment."
],
"natural_attractiveness":[
"Default to distinctly above average naturally very attractive people in a believable real world way.",
"Favor exceptional but believable facial harmony, healthy youthful vibrant features, clear healthy skin, bright alive eyes, naturally full lips, strong natural appeal, and a very good looking overall impression.",
"The subject should read as obviously attractive at first glance while still looking like a real person rather than a glamorized model.",
"Push attractiveness harder than before while keeping it organic, unpolished, and believable.",
"Minor blemishes and real skin variation are allowed for realism."
],
"fit_body_bias":[
"Default to a very fit healthy physique in a believable real world way.",
"Favor lean toned proportions, visible health, athletic femininity or athletic masculinity depending on the subject, and a strong overall impression of physical fitness.",
"The body should read as clearly fit, healthy, lean, and well kept without looking staged, exaggerated, bodybuilder extreme, or glamorized.",
"Push the fit healthy visual read harder while staying realistic."
],
"anti_front_camera_failure":[
"Never generate a mirror selfie.",
"Never generate an outside view of someone taking a selfie.",
"Never generate a photo of a person visibly holding a phone toward the camera.",
"Never show the phone unless explicitly requested.",
"No mirror logic, reflection logic, third person capture logic, or fake selfie posture from an outside camera angle.",
"No second phone in the non-camera hand.",
"No visible recording device in frame.",
"No floating-cameraman feeling."
],
"anti_ui_overlay":[
"Never generate UI overlay.",
"Never generate app buttons, icons, sidebars, menus, controls, interface chrome, camera interface elements, screenshot artifacts, watermark, or text overlay.",
"Do not make the image look like a screenshot from software."
],
"anti_pose":[
"No model pose, influencer pose, mirror pose, frozen aesthetic pose, or performative pretty pose.",
"Body language must feel casual, unforced, and like the subject is naturally talking while walking."
],
"environment_realism":[
"Render the real life version of the requested setting.",
"The setting may be indoors or outdoors and must remain flexible unless user intent specifies otherwise.",
"No cinematic, showroom clean, studio built, designer staged, or unnaturally curated environments.",
"Allow believable clutter, ordinary imperfection, normal object placement, realistic wear, and normal day to day environmental irregularity when appropriate."
],
"background_exclusion":[
"There must be no people in the background.",
"There must be no animals in the background.",
"There must be no sentient beings or humanlike figures in the background.",
"Only the main avatar may appear in the image."
],
"walking_logic":[
"This is a handheld walking capture, not a static standing portrait.",
"The lower-held angle should still feel casual and social, not dramatic, heroic, or fashion-editorial.",
"Subtle handheld inconsistency, framing drift, mild bounce, and ordinary movement imbalance are allowed."
],
"low_angle_specific_locks":[
"The frame must clearly read as lower-held upward front camera capture rather than neutral chest-level or high-held.",
"The camera should sit below face level and angle upward gently, but not so low that the subject looks down at the ground.",
"The upward angle must still preserve closeness to the face and natural connection to the lens.",
"The eyes must still meet the lens even in the lower-held upward geometry.",
"The face must not be tilted downward toward the floor.",
"The chin must not be tucked into the chest.",
"The effect must not resemble a surveillance angle, knee-level angle, or awkward body-cam angle."
]
},
"reference_handling":{
"primary_rule":"If there is a reference photo, use it only for facial identity and overall person resemblance. Ignore shot type, visible phone, mirror, framing, pose, hand position, arm position, composition, camera angle, walking angle, device visibility, and environment layout.",
"extract_only":[
"face shape",
"facial structure",
"approximate age",
"skin tone",
"hair color",
"hair texture",
"hair density",
"eye shape",
"brow shape",
"nose shape",
"lip shape",
"overall facial harmony",
"general vibe"
],
"ignore":[
"shot type",
"selfie logic",
"mirror logic",
"visible phone",
"phone case",
"hand position",
"arm position",
"pose",
"framing",
"crop logic",
"camera angle",
"reflection",
"background layout",
"scene staging",
"beauty styling",
"UI overlay",
"interface elements"
]
},
"avatar_block":{
"identity_features":"{{IDENTITY_FEATURES}}",
"hair_details":"{{HAIR_DETAILS}}",
"face_details":"{{FACE_DETAILS}}",
"skin_details":"{{SKIN_DETAILS}}",
"body_details":"{{BODY_DETAILS}}",
"outfit_details":"{{OUTFIT_DETAILS}}",
"vibe_details":"{{VIBE_DETAILS}}",
"subject_rule":"The subject must look like a real human in a casual direct front camera conversational walking moment and should default to being distinctly naturally attractive, very good looking, healthy, youthful, vibrant, visually appealing, and very fit without looking glamorized or artificially perfected.",
"realism_targets":[
"natural skin texture",
"clear healthy looking skin without airbrushing",
"minor asymmetry preserved",
"realistic under eye depth",
"subtle skin variation allowed",
"believable hair strands and flyaways",
"naturally full youthful lips with healthy natural color",
"bright alive eyes and facial features",
"exceptional but believable facial harmony",
"healthy youthful vitality",
"very fit lean toned but believable physique",
"small real life imperfections preserved",
"eyes directed at the camera lens",
"natural walking expression",
"face still attractively readable from lower-held upward geometry"
],
"forbidden":[
"glamour face",
"beauty campaign face",
"hyper polished influencer face",
"airbrushed skin",
"plastic skin",
"CGI sheen",
"hyper symmetry correction",
"over sculpted facial planes",
"over sharpened jawline",
"cosmetic filter look",
"extreme bodybuilder look",
"unnaturally exaggerated physique",
"eyes looking down at ground",
"chin tucked toward chest",
"face pointed at feet"
]
},
"environment_block":{
"setting_details":"{{SETTING_DETAILS}}",
"environment_rule":"The environment must look like the real life version of the requested place as casually captured on a phone front camera while walking. It can be indoors or outdoors, but it must remain ordinary, believable, and empty of people and animals.",
"targets":[
"physically believable",
"naturally imperfect",
"lightly lived in when appropriate",
"ordinary object placement",
"real material textures",
"normal clutter when appropriate",
"ordinary indoor or outdoor walking logic",
"no background people",
"no background animals",
"no background sentient beings"
],
"forbidden":[
"cinematic staging",
"set design look",
"studio environment",
"showroom perfection",
"designer catalog composition",
"over curated decor",
"unrealistically beautiful background",
"background crowd",
"background pedestrian",
"background shopper",
"background coworker",
"background friend",
"background stranger",
"background animal",
"background pet",
"background human figure"
]
},
"body_language_and_expression":{
"core_rule":"The subject must feel like they are about to talk or already talking while walking, not like they are posing.",
"gaze_expression_rule":"The avatar should look at the camera with a natural organic glance, like a real person casually speaking while walking and briefly connecting with a lower-held front camera.",
"allowed":[
"casual upright movement",
"subtle natural head angle that still preserves lens connection",
"soft conversational attentiveness",
"mid thought",
"mid reaction",
"natural half smile",
"relaxed posture with believable tension",
"natural walking motion",
"organic eye contact with the lens"
],
"forbidden":[
"mirror selfie posture",
"phone holding pose with visible device",
"model pose",
"influencer pose",
"hip pop pose",
"arched posture",
"contrived flirt pose",
"beauty shot face",
"hard model stare",
"posed duck face",
"camera ready performative expression",
"eyes looking down at feet",
"face pointed downward",
"awkward low-angle submission pose"
]
},
"camera_spec":{
"device_style":"modern iPhone front camera aesthetic",
"aspect_ratio":"9:16",
"flash":"off",
"camera_position":"slightly below face level and angled upward with slight natural handheld variance during walking",
"distance":"close arm length conversational distance consistent with true front camera use",
"framing":[
"head and upper torso dominant",
"chest up or upper torso crop",
"slight upward low-held crop",
"close enough for direct connection",
"natural smartphone framing",
"not stylized like portrait photography",
"not framed like a mirror selfie"
],
"lens_and_processing":[
"mild front camera wide angle behavior typical of a phone",
"subtle front camera foreshortening",
"subtle natural edge falloff",
"no exaggerated distortion",
"sharpest on eyes and central face",
"natural smartphone depth behavior",
"no portrait mode glamour blur",
"realistic smartphone HDR",
"light denoising",
"subtle smartphone sharpening",
"minor highlight compression",
"slight white balance inconsistency when natural",
"believable dynamic range"
],
"device_visibility_rule":"The phone must never be visible in frame unless explicitly requested.",
"ui_visibility_rule":"No camera UI, no app UI, no overlay, no browser controls, no screenshot framing, and no interface elements may appear."
},
"realism_and_lighting":{
"core_goal":"The image must look like a real organic phone capture of a real person in a real moment in a real place.",
"lighting_rule":"Lighting must feel natural, candid, and organic. Never glamorize through lighting, but allow a distinctly attractive, healthy, clear, vibrant, flattering real world appearance and a very fit healthy overall impression without losing realism.",
"allowed":[
"soft window light",
"ordinary indoor daylight",
"mixed natural room light",
"normal ambient home light",
"normal office light",
"normal hallway light",
"normal dorm light",
"normal store light",
"natural overcast outdoor light",
"everyday exterior light"
],
"forbidden":[
"studio portrait lighting",
"beauty dish lighting",
"editorial glamour lighting",
"fashion campaign lighting",
"cinematic rim light",
"polished ad lighting",
"luxury polish",
"hyper clean aesthetic polish",
"studio realism",
"cinematic realism",
"commercial ad realism",
"perfect hero lighting"
]
},
"hard_negative_prompt":[
"mirror selfie",
"person taking a photo",
"photo of someone taking a photo",
"visible phone",
"phone in hand",
"phone covering face",
"second phone",
"phone held in free hand",
"mirror",
"reflection",
"bathroom mirror",
"mirror composition",
"third person shot",
"outside observer perspective",
"over the shoulder shot",
"tripod shot",
"camera visible",
"UI overlay",
"camera UI",
"browser UI",
"app interface",
"menu icons",
"buttons overlay",
"watermark",
"text overlay",
"screenshot artifacts",
"photoshoot pose",
"influencer pose",
"model pose",
"beauty campaign",
"fashion campaign",
"luxury aesthetic",
"glamour lighting",
"studio portrait",
"airbrushed skin",
"plastic skin",
"CGI sheen",
"hyper symmetry",
"synthetic hair",
"beauty filter",
"polished portrait",
"portrait mode glamour blur",
"DSLR look",
"cinematic bokeh",
"cinematic environment",
"studio indoors",
"studio outdoors",
"showroom room",
"designer catalog room",
"perfectly staged interior",
"over curated background",
"impossibly clean environment",
"background people",
"background crowd",
"background pedestrians",
"background shoppers",
"background coworkers",
"background friends",
"background strangers",
"background animals",
"background pets",
"eyes looking down",
"eyes looking at feet",
"chin tucked down",
"face pointed at ground",
"awkward low angle",
"surveillance angle",
"bodycam angle",
"cartoon",
"anime",
"illustration",
"painting",
"extra fingers",
"warped hands",
"deformed face"
],
"final_instruction_block":{
"non_negotiable_rules":[
"Never glamorize.",
"Never generate a mirror selfie.",
"Never generate an outside observer shot of someone taking a selfie.",
"Never show the phone unless explicitly requested.",
"Never show UI overlay, app UI, camera UI, screenshot artifacts, controls, or browser interface.",
"Never copy shot composition from reference images.",
"Always keep the image natural, organic, candid, conversational, and physically believable.",
"Always make the subject feel like they are about to talk or already talking while walking.",
"Always keep the camera as direct front camera output.",
"Always render the environment as a realistic real life version of the requested setting.",
"Default every avatar to distinctly above average natural attractiveness while keeping them realistic, non glamorized, and physically believable.",
"Default every avatar to a very fit, healthy, lean toned physique while keeping the body believable and not exaggerated.",
"Always keep the avatar's eyes directed toward the camera lens in a natural organic way.",
"Never include background people, background animals, or any other sentient beings.",
"Preserve the lower-held upward conversational walking capture logic without letting the subject look down at their feet."
]
}
}


















Application 3:

{
"template_name":"front_camera_conversational_walking_frame_final_v1_low_held_upward_application",
"template_purpose":"Final merged prompt created from user intent plus master template. Low-held upward direct front camera conversational walking frame.",
"source_user_intent":"make a really pretty fit girl walking on a quiet path talking to the camera naturally. i want the camera a little lower looking up but still super realistic and not polished.",
"resolved_intent_summary":"Create a very attractive naturally believable fit young woman in a direct front camera conversational walking frame with a lower-held upward iPhone front-camera angle. She is walking on a quiet path while talking, eyes naturally connecting with the lens, phone never visible, no UI overlay, no background people or animals, no glamorized polish, and the low-held geometry must still keep the face connected to camera rather than looking down at the ground.",
"priority_order":[
"true front camera capture overrides all pose and framing",
"direct front camera conversational walking frame overrides selfie-photo interpretations",
"user wants lower camera looking up",
"low-held upward capture geometry must be preserved correctly",
"eyes must look at the camera lens in a natural organic way",
"natural realism over aesthetics",
"distinctly above average natural attractiveness without glamor",
"very fit healthy physique without exaggeration",
"no visible phone in frame ever",
"no UI overlay or interface artifacts ever",
"no background people animals or sentient beings"
],
"core_output_identity":{
"absolute_rule":"Generate a direct front camera conversational walking frame from a modern iPhone like device.",
"camera_pov_rule":"The image is the phone front camera output itself, never an outside observer view.",
"shot_definition_rule":"Direct front camera walking conversational image only. Not a mirror shot, reflection shot, third person shot, photo of someone taking a photo, or screenshot of an interface.",
"capture_truth_rule":"The image must read as an actual arm length front camera capture made by the subject while walking.",
"front_camera_geometry_rule":"Use true front camera geometry: close arm length distance, mild front camera wide angle behavior, upper torso dominant framing, slight handheld variance, believable walking drift, and lower-held upward camera logic that still preserves face connection.",
"angle_rule":"Use a lower-held upward angle with the camera below face level and angled upward in a believable casual arm-length front camera capture.",
"arm_rule":"The camera holding arm is implied from the lower camera side and normally remains off frame. The frame must still read as self-captured handheld front camera output.",
"gaze_rule":"The subject's pupils and gaze must be directed toward the camera lens in a natural organic way.",
"anti_low_angle_failure_rule":"The avatar must not look down at the ground, must not tuck the chin into the chest, and must not point the face toward the floor. The eyes must still connect with the lens."
},
"avatar_block":{
"identity_features":"young adult woman, very attractive, fit, believable real person",
"hair_details":"natural everyday hair with believable strands and soft motion from walking",
"face_details":"very pretty but natural facial harmony, healthy youthful features, bright alive eyes, soft natural lips, no polish",
"skin_details":"clear healthy skin with natural texture and subtle real variation",
"body_details":"very fit healthy lean toned but believable physique",
"outfit_details":"casual everyday walking outfit appropriate for a quiet path, attractive but ordinary and realistic",
"vibe_details":"natural walking conversation, calm, organic, super realistic, non-performative",
"subject_rule":"The subject must look like a real human in a casual direct front camera conversational walking moment and should default to being distinctly naturally attractive, very good looking, healthy, youthful, vibrant, visually appealing, and very fit without looking glamorized or artificially perfected.",
"realism_targets":[
"natural skin texture",
"clear healthy looking skin without airbrushing",
"minor asymmetry preserved",
"realistic under eye depth",
"subtle skin variation allowed",
"believable hair strands and flyaways",
"naturally full youthful lips with healthy natural color",
"bright alive eyes and facial features",
"exceptional but believable facial harmony",
"healthy youthful vitality",
"very fit lean toned but believable physique",
"small real life imperfections preserved",
"eyes directed at the camera lens",
"face still attractively readable from lower-held upward geometry"
],
"forbidden":[
"glamour face",
"beauty campaign face",
"hyper polished influencer face",
"airbrushed skin",
"plastic skin",
"cosmetic filter look",
"extreme bodybuilder look",
"unnaturally exaggerated physique",
"eyes looking down",
"chin tucked toward chest",
"face pointed at ground"
]
},
"environment_block":{
"setting_details":"ordinary quiet path environment, believable and empty of other people and animals",
"environment_rule":"The environment must look like a real quiet walking path captured casually on a phone front camera while walking. It must remain ordinary, believable, and empty of people and animals.",
"targets":[
"physically believable",
"naturally imperfect",
"real path textures and natural outdoor depth",
"quiet solo walking feel",
"no background people",
"no background animals",
"no background sentient beings"
],
"forbidden":[
"cinematic park look",
"luxury outdoor polish",
"travel ad scenery",
"background pedestrians",
"background friends",
"background animals",
"background pets"
]
},
"body_language_and_expression":{
"core_rule":"The subject must feel like she is already talking while walking, not posing.",
"gaze_expression_rule":"The avatar should look at the camera with a natural organic glance, like a real person speaking while walking with a lower-held front camera.",
"allowed":[
"casual upright movement",
"soft conversational attentiveness",
"mid sentence",
"natural half smile",
"subtle natural head angle that still preserves lens connection",
"organic eye contact with the lens",
"relaxed posture with believable tension"
],
"forbidden":[
"hero pose",
"model pose",
"influencer pose",
"beauty shot face",
"hard model stare",
"eyes looking down at feet",
"face pointed downward",
"awkward bodycam feel"
]
},
"camera_spec":{
"device_style":"modern iPhone front camera aesthetic",
"aspect_ratio":"9:16",
"flash":"off",
"camera_position":"slightly below face level and angled upward with slight natural handheld variance during walking",
"distance":"close arm length conversational distance consistent with true front camera use",
"framing":[
"head and upper torso dominant",
"slight upward low-held crop",
"close enough for direct connection",
"natural smartphone framing"
],
"lens_and_processing":[
"mild front camera wide angle behavior typical of a phone",
"subtle front camera foreshortening",
"sharpest on eyes and central face",
"natural smartphone depth behavior",
"realistic smartphone HDR",
"light denoising",
"subtle smartphone sharpening",
"believable dynamic range"
],
"device_visibility_rule":"The phone must never be visible in frame.",
"ui_visibility_rule":"No UI overlay, no app interface, no browser controls, and no screenshot artifacts may appear."
},
"realism_and_lighting":{
"core_goal":"The image must look like a real organic phone capture of a real person in a real outdoor place.",
"lighting_rule":"Lighting must feel natural, candid, and organic. Never glamorize through lighting.",
"allowed":[
"natural daylight",
"soft outdoor daylight",
"open shade",
"mild overcast light",
"ordinary sunny light",
"real front camera auto exposure behavior"
],
"forbidden":[
"studio portrait lighting",
"editorial glamour lighting",
"cinematic lighting",
"polished ad lighting"
]
},
"hard_negative_prompt":[
"visible phone",
"phone in hand",
"second phone",
"UI overlay",
"camera UI",
"browser UI",
"app interface",
"watermark",
"text overlay",
"mirror selfie",
"third person shot",
"beauty campaign",
"glamour lighting",
"airbrushed skin",
"background people",
"background pedestrians",
"background animals",
"eyes looking down",
"chin tucked down",
"face pointed at ground",
"surveillance angle",
"bodycam angle",
"cartoon",
"anime"
],
"final_instruction_block":{
"non_negotiable_rules":[
"Never show a phone in frame.",
"Never show UI overlay or interface artifacts.",
"Always keep the eyes naturally directed at the lens.",
"Never include background people or animals.",
"Make the avatar very attractive, very fit, and fully believable.",
"Preserve the low-held upward conversational walking capture logic while keeping the face connected to camera instead of looking down."
]
}
}
