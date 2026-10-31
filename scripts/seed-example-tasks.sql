-- Example task seeds for the Task Library.
--
-- These rows have user_id = NULL, which the app treats as admin-created
-- example tasks: every user sees them in the Task Library (badge "Example")
-- and can practice them, but nobody can edit or delete them.
--
-- Run manually (the repo does not wrap this in a script):
--   npx wrangler d1 execute main-database --local --file scripts/seed-example-tasks.sql
--   npx wrangler d1 execute main-database --remote --file scripts/seed-example-tasks.sql
--
-- Task 1 examples need an image attached for evaluation; the admin system can
-- add those. These seeds cover text-only Task 2 / GT letter prompts.

INSERT INTO tasks (id, user_id, category, subcategory, prompt) VALUES
	('01930a5b-7c1d-7e2f-9a3b-4c5d6e7f8091', NULL, '2', 'opinion-essay',
		'Some people believe that children should be taught how to manage money at an early age, while others think this should be left until they are teenagers. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience.'),
	('01930a5b-7c1d-7e30-8b4c-4c5d6e7f8092', NULL, '2', 'discussion-essay',
		'Some people think that universities should provide students with the knowledge and skills needed in the workplace, while others believe the true function of a university is to give access to knowledge for its own sake, regardless of whether the course is useful to an employer. Discuss both these views and give your own opinion.'),
	('01930a5b-7c1d-7e31-aa5d-4c5d6e7f8093', NULL, '2', 'advantages-disadvantages-essay',
		'In many countries, people are choosing to work remotely instead of travelling to an office every day. What are the advantages and disadvantages of this development? Give reasons for your answer and include any relevant examples from your own knowledge or experience.'),
	('01930a5b-7c1d-7e32-9b6e-4c5d6e7f8094', NULL, '2', 'problem-solution-essay',
		'In many cities, an increasing number of people do not know their neighbours, and the sense of community is being lost. What are the causes of this? What are some possible solutions? Give reasons for your answer and include any relevant examples from your own knowledge or experience.'),
	('01930a5b-7c1d-7e33-8c7f-4c5d6e7f8095', NULL, '2', 'two-part-question-essay',
		'Nowadays many people spend less and less time at home. What are the reasons for this? What effects does this have on individuals and on society? Give reasons for your answer and include any relevant examples from your own knowledge or experience.'),
	('01930a5b-7c1d-7e34-ba81-4c5d6e7f8096', NULL, '2', 'letter',
		'You recently bought a piece of equipment for your kitchen but it did not work. You phoned the shop but no action was taken. Write a letter to the shop manager. In your letter: describe the problem with the equipment; explain what happened when you phoned the shop; say what you would like the manager to do. Begin your letter as follows: Dear Sir or Madam,');
