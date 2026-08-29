<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\TriviaSpecies;
use App\Enums\TriviaTone;
use App\Models\Eloquent\Trivia;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * The 200-fact trivia corpus: 80 happy, 80 neutral, 40 heartbreaking. The
 * dashboard card draws only happy and neutral, so those two carry the bulk;
 * heartbreaking serves its own feed page, behind the same content warning as
 * the posts.
 *
 * The table is wholly seeder-owned - there is no write endpoint - so a re-run
 * simply replaces everything. That also removes facts a later edit deleted,
 * which an upsert would leave behind. Counts are pinned by TriviaSeederTest,
 * so an edit that unbalances a tone fails the suite rather than the seed.
 */
class TriviaSeeder extends Seeder
{
    public function run(): void
    {
        $corpus = [
            TriviaTone::Happy->value => $this->happy(),
            TriviaTone::Neutral->value => $this->neutral(),
            TriviaTone::Heartbreaking->value => $this->heartbreaking(),
        ];

        $now = now();
        $rows = [];

        foreach ($corpus as $tone => $facts) {
            foreach ($facts as [$species, $text]) {
                $rows[] = [
                    'text' => $text,
                    'tone' => $tone,
                    'species' => $species->value,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::transaction(function () use ($rows): void {
            Trivia::query()->delete();

            foreach (array_chunk($rows, 100) as $chunk) {
                DB::table('trivias')->insert($chunk);
            }
        });

        $this->command->info(sprintf('TriviaSeeder: %d trivia seeded.', count($rows)));
    }

    /**
     * @return list<array{TriviaSpecies, string}>
     */
    private function happy(): array
    {
        return [
            [TriviaSpecies::Dog, 'Petting a dog for just a few minutes measurably lowers cortisol, the body\'s main stress hormone.'],
            [TriviaSpecies::Dog, 'Dogs and their people release oxytocin, the same bonding hormone shared by parents and babies, just by looking at each other.'],
            [TriviaSpecies::Cat, 'A slow blink is cat for trust; offer one back and many cats will return it.'],
            [TriviaSpecies::Cat, 'Cats knead the people they love, a comfort behavior kept from their nursing days as kittens.'],
            [TriviaSpecies::Dog, 'A loose, sweeping tail wag with soft ears is a dog\'s honest smile.'],
            [TriviaSpecies::Cat, 'A cat that greets you tail-up, with a little hook at the tip, is giving you its friendliest hello.'],
            [TriviaSpecies::Dog, 'A border collie named Chaser learned the names of more than 1,000 toys.'],
            [TriviaSpecies::Cat, 'Adult cats rarely meow at one another; the meow is a language they keep mostly for talking to us.'],
            [TriviaSpecies::Dog, 'Therapy dogs on hospital rounds measurably ease patients\' anxiety and pain.'],
            [TriviaSpecies::Both, 'Adopting a shelter pet changes two lives: the one you take home and the one that gets the empty kennel.'],
            // --- 10
            [TriviaSpecies::Dog, 'Dogs paddle and twitch in REM sleep, and researchers believe they dream, likely about familiar people and places.'],
            [TriviaSpecies::Cat, 'A cat that bumps its head against you is marking you as family with the scent glands on its face.'],
            [TriviaSpecies::Dog, 'Many dogs learn the sound of their person\'s car and are waiting at the door before the key turns.'],
            [TriviaSpecies::Cat, 'A cat\'s purr sits roughly between 25 and 150 hertz, a frequency range studied for its calming effects on people.'],
            [TriviaSpecies::Dog, 'Trained alert dogs can smell changes in blood sugar and warn their diabetic owners before a crash.'],
            [TriviaSpecies::Cat, 'Mother cats purr so their newborns, born blind and deaf, can feel their way to her side.'],
            [TriviaSpecies::Dog, 'Even one short outing away from the shelter measurably lowers a dog\'s stress hormones.'],
            [TriviaSpecies::Both, 'Senior pets often arrive house-trained and calm, and adopters routinely call them the easiest roommates they have ever had.'],
            [TriviaSpecies::Cat, 'Research suggests cats form secure attachments to their people at about the same rate human infants do.'],
            [TriviaSpecies::Dog, 'Search-and-rescue dogs have found survivors buried in rubble more than a week after an earthquake.'],
            // --- 20
            [TriviaSpecies::Cat, 'A cat choosing to sleep on you is a high compliment: it picked the safest spot it knows.'],
            [TriviaSpecies::Dog, 'Dogs catch yawns from their owners, and they catch them more from their own person than from strangers.'],
            [TriviaSpecies::Both, 'Study after study links living with a pet to lower loneliness and steadier daily routines.'],
            [TriviaSpecies::Dog, 'Most retired guide dogs stay right where they are, living out their days as the family pet.'],
            [TriviaSpecies::Cat, 'Shy shelter cats often blossom within weeks of adoption, once they finally have a quiet room and a routine.'],
            [TriviaSpecies::Dog, 'Dogs tilt their heads while listening, and studies suggest the tilt marks a dog processing words it knows.'],
            [TriviaSpecies::Cat, 'Cats groom the people and animals they bond with; a lick on your arm is social grooming, not hunger.'],
            [TriviaSpecies::Both, 'Shelter live-release rates have climbed year after year; most animals that enter today walk back out to a home.'],
            [TriviaSpecies::Dog, 'When a dog smells its owner, the reward center of its brain lights up, brain scans show.'],
            [TriviaSpecies::Cat, 'Cats develop a special trill some use only to greet their favorite person.'],
            // --- 30
            [TriviaSpecies::Dog, 'Most retiring military and police dogs are adopted by their own handlers.'],
            [TriviaSpecies::Cat, 'Stroking a purring cat has been shown to lower blood pressure in stressed volunteers.'],
            [TriviaSpecies::Both, 'The zoomies have a scientific name, frenetic random activity periods, and they are a sign of a comfortable, happy animal.'],
            [TriviaSpecies::Dog, 'Dogs are one of the very few species that seek out human eye contact for guidance.'],
            [TriviaSpecies::Cat, 'Plenty of cats teach themselves to play fetch, dropping the toy at your feet until you throw it again.'],
            [TriviaSpecies::Both, 'Most shelters now offer trial sleepovers, and a large share of sleepovers end in adoption.'],
            [TriviaSpecies::Dog, 'Dogs have a voice area in their brains, and it responds most strongly to happy human voices.'],
            [TriviaSpecies::Cat, 'Kittens start purring when they are only a few days old.'],
            [TriviaSpecies::Both, 'Children practicing reading aloud do better with a pet listening, which is why libraries run read-to-a-dog programs.'],
            [TriviaSpecies::Dog, 'In 1923 a dog named Bobbie walked more than 2,500 miles from Indiana back home to Oregon.'],
            // --- 40
            [TriviaSpecies::Cat, 'A cat named Stubbs served as honorary mayor of Talkeetna, Alaska, for twenty years.'],
            [TriviaSpecies::Cat, 'Félicette, the first cat to fly to space, parachuted safely back to Earth in 1963.'],
            [TriviaSpecies::Dog, 'In 1925 sled dogs, led by Togo and Balto, relayed lifesaving serum 674 miles through a blizzard to Nome, Alaska.'],
            [TriviaSpecies::Both, 'Cats and dogs can donate blood, and one regular donor can save several other animals a year.'],
            [TriviaSpecies::Dog, 'Shelter and rescue dogs are regularly recruited into search-and-rescue and detection work.'],
            [TriviaSpecies::Cat, 'Cats say hello to each other by touching noses, and many offer the same greeting to a trusted human hand.'],
            [TriviaSpecies::Dog, 'Dogs wag more to the right side when they see someone they love.'],
            [TriviaSpecies::Cat, 'Cats take to clicker training just like dogs, and shelters report trained cats charm their way out faster.'],
            [TriviaSpecies::Dog, 'Retired racing greyhounds are famous couch potatoes, happiest sleeping away the afternoon beside their adopter.'],
            [TriviaSpecies::Both, 'Playing with a pet raises dopamine and serotonin, the brain\'s pleasure and calm chemicals, in the human too.'],
            // --- 50
            [TriviaSpecies::Dog, 'In experiments, dogs hurried to open a door when their owner cried behind it.'],
            [TriviaSpecies::Cat, 'Cat cafés began in Taiwan in 1998 and now help re-home cats around the world.'],
            [TriviaSpecies::Dog, 'The Beatles ended the Sgt. Pepper album with a tone pitched for dogs, a hidden treat for listening ears.'],
            [TriviaSpecies::Cat, 'Dewey the library cat of Spencer, Iowa, was found in a book drop and spent nineteen years greeting patrons.'],
            [TriviaSpecies::Dog, 'Dogs recognize former owners and friends even after years apart, and the reunions are unmistakable.'],
            [TriviaSpecies::Both, 'Seniors-for-seniors programs match older adopters with older pets, often with the adoption fee waived.'],
            [TriviaSpecies::Cat, 'Cats twine their tails around companions they trust, the feline version of holding hands.'],
            [TriviaSpecies::Dog, 'The play bow is a dog\'s universal invitation, offered to people, cats and even other species.'],
            [TriviaSpecies::Cat, 'Many deaf or blind cats live rich, playful lives, mapping whole houses by whisker, scent and memory.'],
            [TriviaSpecies::Both, 'Foster homes fall in love and adopt so often that shelters coined a badge of honor for it: the foster fail.'],
            // --- 60
            [TriviaSpecies::Dog, 'Letting a dog sniff its way through a walk measurably calms it; sniffing is how a dog reads the news.'],
            [TriviaSpecies::Cat, 'Cats know their names; studies in Japan showed they recognize them even spoken by a stranger.'],
            [TriviaSpecies::Dog, 'Researchers estimate an average family dog can learn well over a hundred words and gestures.'],
            [TriviaSpecies::Cat, 'Ancient Egyptian art shows cats sitting under the family dinner chair 3,000 years ago; cats have been family that long.'],
            [TriviaSpecies::Dog, 'Hearing dogs wake their deaf owners for alarms and doorbells, and many are recruited from shelters.'],
            [TriviaSpecies::Both, 'Growing up with a pet in the house is linked to fewer allergies later in life.'],
            [TriviaSpecies::Dog, 'Dogs\' noses can be trained to find lost pets, truffles, invasive species and even endangered orchids.'],
            [TriviaSpecies::Cat, 'A cat\'s whiskers swing forward when it is curious and pleased, pointing at whatever has its attention.'],
            [TriviaSpecies::Dog, 'Puppies start wagging their tails at about three weeks old, right as their eyes open and the world gets interesting.'],
            [TriviaSpecies::Cat, 'Cats invented the cat nap: a dozen short dozes a day keep them ready to play at a moment\'s notice.'],
            // --- 70
            [TriviaSpecies::Dog, 'Studies suggest a dog\'s heartbeat settles toward its owner\'s when they rest together.'],
            [TriviaSpecies::Cat, 'In Japan and much of Britain, a black cat crossing your path is good luck.'],
            [TriviaSpecies::Both, 'Mixed-breed pets often enjoy fewer inherited health problems, a quiet perk of adopting a one-of-a-kind mutt or moggy.'],
            [TriviaSpecies::Dog, 'Dogs read human pointing and glances better than chimpanzees do.'],
            [TriviaSpecies::Cat, 'When a cat flops over and shows you its belly, it is saying it feels completely safe with you.'],
            [TriviaSpecies::Dog, 'Three-legged dogs usually adapt within weeks and run, swim and play like everyone else at the park.'],
            [TriviaSpecies::Cat, 'Cats can pick their owner\'s voice out from strangers saying the same words.'],
            [TriviaSpecies::Dog, 'Dogs evolved a special eyebrow muscle wolves barely have, mostly for making puppy-dog eyes at us.'],
            [TriviaSpecies::Cat, 'Mother cats adopt orphans readily, and cats have famously nursed puppies, squirrels and even ducklings.'],
            [TriviaSpecies::Both, 'Cats and dogs raised together commonly become genuine friends, greeting and grooming each other like littermates.'],
            // --- 80
        ];
    }

    /**
     * @return list<array{TriviaSpecies, string}>
     */
    private function neutral(): array
    {
        return [
            [TriviaSpecies::Dog, 'A dog\'s nose print is as individual as a human fingerprint.'],
            [TriviaSpecies::Cat, 'A cat\'s nose print is unique too: the bumps and ridges form a one-of-a-kind pattern.'],
            [TriviaSpecies::Dog, 'Dogs have around 300 million scent receptors; humans have about six million.'],
            [TriviaSpecies::Cat, 'A cat\'s sense of smell is roughly fourteen times stronger than a human\'s.'],
            [TriviaSpecies::Dog, 'A dog\'s wet nose is a scent trap: the moisture catches airborne chemicals for tasting the air.'],
            [TriviaSpecies::Cat, 'Cats have a second scent organ in the roof of the mouth; the open-mouthed grimace that uses it is called the flehmen response.'],
            [TriviaSpecies::Dog, 'Dogs sweat mainly through their paw pads and cool off by panting.'],
            [TriviaSpecies::Cat, 'Cats sweat through their paws too, which is why a nervous cat leaves damp little prints on the exam table.'],
            [TriviaSpecies::Both, 'Cats and dogs both have a third eyelid that sweeps in from the corner of the eye.'],
            [TriviaSpecies::Dog, 'Dogs hear sounds pitched roughly twice as high as anything a human can catch.'],
            // --- 10
            [TriviaSpecies::Cat, 'Cats hear higher still, up to about 64,000 hertz, one of the broadest hearing ranges among mammals.'],
            [TriviaSpecies::Dog, 'A dog\'s ear is steered by about eighteen muscles.'],
            [TriviaSpecies::Cat, 'A cat\'s ear has thirty-two muscles and can rotate about 180 degrees.'],
            [TriviaSpecies::Cat, 'Cats cannot taste sweetness; the gene for the sweet receptor is broken in every cat.'],
            [TriviaSpecies::Dog, 'Dogs have about 1,700 taste buds to a human\'s roughly 9,000.'],
            [TriviaSpecies::Cat, 'A cat\'s tongue is covered in backward-facing keratin hooks, the same material as its claws.'],
            [TriviaSpecies::Dog, 'Greyhounds can hit about 45 miles per hour, making them the fastest dogs on earth.'],
            [TriviaSpecies::Cat, 'A house cat can sprint at about 30 miles per hour in short bursts.'],
            [TriviaSpecies::Cat, 'A cat can clear several times its own height in a single standing leap.'],
            [TriviaSpecies::Dog, 'The Basenji does not bark; it yodels.'],
            // --- 20
            [TriviaSpecies::Dog, 'Dalmatian puppies are born pure white and grow their spots in the first weeks.'],
            [TriviaSpecies::Dog, 'Chow Chows and Shar-Peis have blue-black tongues.'],
            [TriviaSpecies::Cat, 'A group of cats is a clowder; a group of kittens is a kindle.'],
            [TriviaSpecies::Dog, 'Newfoundland dogs have webbed feet and a swimming stroke, bred for water rescue.'],
            [TriviaSpecies::Cat, 'Cats have no functional collarbone, which is why one can pour itself through any gap its head fits.'],
            [TriviaSpecies::Cat, 'A cat\'s whiskers are roughly as wide as its body, a built-in gauge for tight spaces.'],
            [TriviaSpecies::Dog, 'Puppies are born blind, deaf and toothless; eyes and ears open at around two weeks.'],
            [TriviaSpecies::Cat, 'Every kitten\'s eyes are blue when they first open; adult color arrives over the following weeks.'],
            [TriviaSpecies::Dog, 'Dogs curl into a ball to sleep by instinct, guarding vitals and keeping warm as their ancestors did.'],
            [TriviaSpecies::Cat, 'Cats share an unusual walking gait with camels and giraffes: both legs on one side, then both on the other.'],
            // --- 30
            [TriviaSpecies::Dog, 'Dogs were domesticated at least 15,000 years ago, the oldest of all domesticated animals.'],
            [TriviaSpecies::Cat, 'A cat was buried beside a human on Cyprus about 9,500 years ago, long before ancient Egypt.'],
            [TriviaSpecies::Cat, 'Cats essentially domesticated themselves, moving in when the first grain stores drew the first mice.'],
            [TriviaSpecies::Dog, 'The Saluki is among the oldest known dog breeds, depicted in art thousands of years old.'],
            [TriviaSpecies::Cat, 'Ancient writers say Egyptian families shaved their eyebrows to mourn the death of a cat.'],
            [TriviaSpecies::Dog, 'The dog days of summer are named for Sirius, the Dog Star, which rises with the sun in late summer.'],
            [TriviaSpecies::Cat, 'Legend credits Isaac Newton with inventing the cat flap for his cat Spithead.'],
            [TriviaSpecies::Dog, 'Corgi means dwarf dog in Welsh.'],
            [TriviaSpecies::Dog, 'Dachshunds were bred to follow badgers down their burrows; the name means badger dog.'],
            [TriviaSpecies::Dog, 'The poodle\'s show clip began as a working trim to keep a swimming retriever\'s joints warm.'],
            // --- 40
            [TriviaSpecies::Dog, 'Dalmatians ran beside fire wagons to calm the horses, which is how they became firehouse dogs.'],
            [TriviaSpecies::Cat, 'Maine Coons are the largest domestic cat breed; a big male can weigh as much as a small dog.'],
            [TriviaSpecies::Cat, 'The Singapura is the smallest recognized cat breed.'],
            [TriviaSpecies::Cat, 'Calico and tortoiseshell cats are almost always female; the pattern needs two X chromosomes.'],
            [TriviaSpecies::Cat, 'Most orange tabby cats are male.'],
            [TriviaSpecies::Cat, 'Polydactyl cats with extra toes are nicknamed Hemingway cats after the six-toed colony still living at his Key West home.'],
            [TriviaSpecies::Dog, 'The tallest dog ever recorded, a Great Dane named Zeus, stood 44 inches at the shoulder.'],
            [TriviaSpecies::Dog, 'The Chihuahua, the world\'s smallest dog breed, is named for a Mexican state.'],
            [TriviaSpecies::Cat, 'The oldest cat on record, Creme Puff of Texas, lived to 38.'],
            [TriviaSpecies::Dog, 'The oldest dog verified in her era, an Australian cattle dog named Bluey, worked sheep for nearly 29 years.'],
            // --- 50
            [TriviaSpecies::Cat, 'Cats spend up to half their waking hours grooming.'],
            [TriviaSpecies::Cat, 'Cats sleep twelve to sixteen hours a day, around twice as much as their humans.'],
            [TriviaSpecies::Dog, 'Dogs see the world mostly in blues and yellows; red and green look alike to them.'],
            [TriviaSpecies::Cat, 'Cats see well in light six times dimmer than what humans need.'],
            [TriviaSpecies::Cat, 'A mirror layer behind the retina, the tapetum lucidum, is what makes cat eyes glow in headlights.'],
            [TriviaSpecies::Dog, 'A dog\'s field of view spans roughly 250 degrees to a human\'s 180.'],
            [TriviaSpecies::Cat, 'A cat\'s heart beats 140 to 220 times a minute, roughly twice a human\'s pace.'],
            [TriviaSpecies::Cat, 'Adult cats have 30 teeth; kittens cut 26 baby teeth first.'],
            [TriviaSpecies::Dog, 'Adult dogs have 42 teeth, ten more than an adult human.'],
            [TriviaSpecies::Both, 'Neither a cat nor a dog can see directly under its own nose, which is why treats vanish right in front of them.'],
            // --- 60
            [TriviaSpecies::Dog, 'Dogs scoop water by curling the tongue backward like a ladle.'],
            [TriviaSpecies::Cat, 'Cats lap by flicking the water\'s surface and biting off the rising column; physicists clocked four laps a second.'],
            [TriviaSpecies::Dog, 'Dogs circle before lying down, an inherited routine from ancestors flattening grass into a bed.'],
            [TriviaSpecies::Cat, 'Cats purr continuously, on the inhale and the exhale both, which is why the sound never seems to pause.'],
            [TriviaSpecies::Dog, 'Bloodhound trailing evidence has been cited in American courtrooms for over a century.'],
            [TriviaSpecies::Cat, 'A cat has about 230 bones, two dozen more than a human.'],
            [TriviaSpecies::Dog, 'A high, stiff, fast wag is arousal, not greeting; the friendly wag is the loose, sweeping one.'],
            [TriviaSpecies::Cat, 'Nearly a tenth of a cat\'s bones are in its tail.'],
            [TriviaSpecies::Both, 'Cats and dogs can be left- or right-pawed, and studies keep finding individual paw preferences in both.'],
            [TriviaSpecies::Dog, 'The Labrador retriever topped the American Kennel Club\'s popularity list for more than thirty straight years.'],
            // --- 70
            [TriviaSpecies::Cat, 'Persians appeared at the world\'s first major cat show, held at London\'s Crystal Palace in 1871.'],
            [TriviaSpecies::Dog, 'The first organized dog show was held in Newcastle, England, in 1859.'],
            [TriviaSpecies::Cat, 'Cats grow whiskers on the backs of their front legs too, for reading prey held in the paws.'],
            [TriviaSpecies::Dog, 'Dogs may tell time partly by smell: as an owner\'s scent fades through the day, some learn when to expect them home.'],
            [TriviaSpecies::Cat, 'A cat rubs its cheeks on furniture corners to leave facial pheromones, redrawing its territory map daily.'],
            [TriviaSpecies::Dog, 'Dog years times seven is a myth; a dog ages fastest in its first two years, then the pace slows by size.'],
            [TriviaSpecies::Cat, 'Cat years work the same way: a one-year-old cat is roughly a teenager, and each later year adds about four human years.'],
            [TriviaSpecies::Both, 'A pet microchip is the size of a grain of rice and carries only an ID number, no GPS.'],
            [TriviaSpecies::Dog, 'Dogs\' paws often smell like corn chips thanks to harmless skin bacteria; owners call it Frito feet.'],
            [TriviaSpecies::Both, 'Every coat color a cat or dog wears is mixed from just two pigments, one dark and one red-yellow.'],
            // --- 80
        ];
    }

    /**
     * @return list<array{TriviaSpecies, string}>
     */
    private function heartbreaking(): array
    {
        return [
            [TriviaSpecies::Both, 'Around six million cats and dogs enter American shelters every year; not all of them leave.'],
            [TriviaSpecies::Both, 'Shelter workers report black cats and dogs wait longest for adoption, passed over partly because they photograph poorly.'],
            [TriviaSpecies::Both, 'Senior pets are the least adopted age group, though they are often the calmest, most settled animals in the building.'],
            [TriviaSpecies::Both, 'A large share of surrendered pets lose their homes to landlord rules and moves, not to anything they did.'],
            [TriviaSpecies::Cat, 'Kitten season floods shelters every spring with more litters than there are homes waiting.'],
            [TriviaSpecies::Cat, 'One unspayed cat and her descendants can produce hundreds of kittens in just a few years, most with nowhere to go.'],
            [TriviaSpecies::Dog, 'Hachikō returned to Shibuya Station every day for nine years after his owner died at work; his statue still waits there in bronze.'],
            [TriviaSpecies::Dog, 'Greyfriars Bobby is said to have kept watch at his master\'s Edinburgh grave for fourteen years.'],
            [TriviaSpecies::Dog, 'Laika, the first animal to orbit Earth, was sent up in 1957 with no plan to bring her home.'],
            [TriviaSpecies::Both, 'In the first week of the Second World War, Britain put down an estimated 750,000 pets on official advice.'],
            // --- 10
            [TriviaSpecies::Cat, 'Fewer than one in twenty cats arriving at shelters without a microchip is ever reunited with a family.'],
            [TriviaSpecies::Dog, 'Microchipped dogs get home more than twice as often as unchipped ones, yet millions of pets still carry no chip.'],
            [TriviaSpecies::Both, 'Bonded pairs are routinely separated at shelters because adopters rarely take two animals at once.'],
            [TriviaSpecies::Both, 'Pets grieve each other: after a companion dies, many dogs and cats search the house, eat less and wait at the door.'],
            [TriviaSpecies::Dog, 'In Argentina, a German shepherd named Capitán reportedly slept beside his owner\'s grave for more than a decade.'],
            [TriviaSpecies::Cat, 'Declawing amputates the last bone of each toe; dozens of countries ban it as mutilation.'],
            [TriviaSpecies::Dog, 'Breeding dogs in puppy mills can spend their entire lives in wire cages without once standing on grass.'],
            [TriviaSpecies::Cat, 'FIV-positive cats can live long, ordinary lives, yet many wait years in shelters because of the label alone.'],
            [TriviaSpecies::Dog, 'Deaf dogs, common in white-coated breeds, are sometimes given up for ignoring commands they never heard.'],
            [TriviaSpecies::Cat, 'House-soiling is a top reason cats lose their homes, and it is often a treatable medical problem no one checked.'],
            // --- 20
            [TriviaSpecies::Both, 'Kennel stress makes many animals shut down and hide their real personality exactly when being charming matters most.'],
            [TriviaSpecies::Both, 'Special-needs pets can wait many times longer than average for someone to look past the paperwork.'],
            [TriviaSpecies::Cat, 'A cat living outdoors on its own can expect only a fraction of the lifespan an indoor cat enjoys.'],
            [TriviaSpecies::Dog, 'Parvovirus still kills puppies every year, though a vaccine has existed since the 1970s.'],
            [TriviaSpecies::Dog, 'Some dogs spend their whole lives on a chain, within sight of a family they are never brought inside to join.'],
            [TriviaSpecies::Both, 'During Hurricane Katrina thousands of pets were left behind because rescue boats and shelters refused animals; a federal law followed.'],
            [TriviaSpecies::Dog, 'After 9/11, search dogs finding no survivors grew visibly discouraged, so rescuers hid in the rubble to give them someone to find.'],
            [TriviaSpecies::Dog, 'Most American war dogs that served in Vietnam were classified as surplus equipment and left behind.'],
            [TriviaSpecies::Dog, 'For decades, racing greyhounds were discarded by the thousands the season they slowed down.'],
            [TriviaSpecies::Both, 'Pets who outlive their owners often arrive at shelters grieving, confused and with no plan made for them.'],
            // --- 30
            [TriviaSpecies::Both, 'Euthanasia for lack of space remains a leading cause of death for healthy cats and dogs in much of the world.'],
            [TriviaSpecies::Cat, 'Cats routinely lose homes over scratching furniture, a behavior as natural to a cat as stretching.'],
            [TriviaSpecies::Dog, 'Many puppies sold online come from mass-breeding operations the buyer never sees, and some arrive already sick.'],
            [TriviaSpecies::Both, 'More pets go missing around fireworks holidays than at any other time of year.'],
            [TriviaSpecies::Cat, 'White cats with blue eyes are often born deaf and can spend their whole lives mistaken for aloof.'],
            [TriviaSpecies::Dog, 'Some flat-faced breeds struggle for every breath of their lives, a price paid for the look humans selected.'],
            [TriviaSpecies::Cat, 'Kittens born outside who miss the early socialization window may never learn to trust a human hand.'],
            [TriviaSpecies::Both, 'Shelters beg adopters to wait out the three-week adjustment period, but many pets are returned within the first days.'],
            [TriviaSpecies::Dog, 'American military dogs now come home; the law changed only in 2000, too late for thousands before them.'],
            [TriviaSpecies::Cat, 'In 1996 a New York stray named Scarlett walked into a burning building five times, once for each kitten, and carried every one out.'],
            // --- 40
        ];
    }
}
