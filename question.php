<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Question definition class for crossword.
 *
 * @package     qtype_crossword
 * @copyright   The Open University
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// For a complete list of base question classes please examine the file
// /question/type/questionbase.php.
//
// Make sure to implement all the abstract methods of the base class.
use qtype_crossword\answer;

/**
 * Class that represents a crossword question.
 */
class qtype_crossword_question extends question_graded_automatically {

    /** @var answer[] The answers object. */
    public $answers;

    /** @var int The row number. */
    public $numrows;

    /** @var int The column number. */
    public $numcolumns;

    /** @var string The accented grading type. One of the qtype_crossword::ACCENT_GRADING_... constants. */
    public $accentgradingtype;

    /** @var float The penalty mark for each incorrect accents. */
    public $accentpenalty;

    /** @var string Feedback for any correct response. */
    public $correctfeedback;

    /** @var int format of $correctfeedback. */
    public $correctfeedbackformat;

    /** @var string Feedback for any partially correct response. */
    public $partiallycorrectfeedback;

    /** @var int format of $partiallycorrectfeedback. */
    public $partiallycorrectfeedbackformat;

    /** @var string Feedback for any incorrect response. */
    public $incorrectfeedback;

    /** @var int format of $incorrectfeedback. */
    public $incorrectfeedbackformat;

    /** @var bool Whether smart and straight quotes are matched strictly or relaxed. */
    public $quotematching;

    /**
     * Answer field name.
     *
     * @param int $key Key number.
     * @return string The answer key name.
     */
    protected function field(int $key): string {
        return 'sub' . $key;
    }

    #[\Override]
    public function get_expected_data(): array {
        $response = [];
        for ($i = 0; $i < count($this->answers); $i++) {
            $response[$this->field($i)] = PARAM_RAW_TRIMMED;
        }
        return $response;
    }

    #[\Override]
    public function get_correct_response(): ?array {
        $response = [];
        foreach ($this->answers as $key => $answer) {
            $response[$this->field($key)] = $answer->answer;
        }
        return $response;
    }

    #[\Override]
    public function summarise_response(array $response): ?string {
        $responsewords = [];
        foreach ($this->answers as $key => $answer) {
            $fieldname = $this->field($key);
            $responseword = str_replace('_', ' ', $response[$fieldname] ?? '');
            // If the answer is empty or only contain space. Display '-'.
            if (trim($responseword) === '') {
                $responseword = get_string('missingresponse', 'qtype_crossword');
            }
            $responsewords[] = get_string('answerwithnumber', 'qtype_crossword', [
                'number' => $answer->answernumber,
                'orientation' => get_string($answer->orientation ? 'down' : 'across', 'qtype_crossword'),
                'response' => $responseword,
            ]);
        }
        return implode('; ', $responsewords);
    }

    #[\Override]
    public function is_complete_response(array $response): bool {
        $filteredresponse = $this->remove_blank_words_from_response($response);
        return count($this->answers) === count($filteredresponse);
    }

    #[\Override]
    public function is_gradable_response(array $response): bool {
        $filteredresponse = $this->remove_blank_words_from_response($response);
        return count($filteredresponse) > 0;
    }

    #[\Override]
    public function get_validation_error(array $response): string {
        if ($this->is_complete_response($response)) {
            return '';
        }
        return get_string('pleaseananswerallparts', 'qtype_crossword');
    }

    #[\Override]
    public function is_same_response(array $prevresponse, array $newresponse): bool {
        foreach ($this->answers as $key => $notused) {
            $fieldname = $this->field($key);
            if (!question_utils::arrays_same_at_key(
                $prevresponse, $newresponse, $fieldname)) {
                return false;
            }
        }
        return true;
    }

    #[\Override]
    public function grade_response(array $response): array {
        // Retrieve a number of right answers and total answers.
        [$numrightparts, $total] = $this->get_num_parts_right($response);
        // Retrieve a number of wrong accent numbers.
        $numpartialparts = $this->get_num_parts_partial($response);
        // Calculate fraction.
        $fraction = ($numrightparts + $numpartialparts - $numpartialparts * $this->accentpenalty)
            / $total;

        return [$fraction, question_state::graded_state_for_fraction($fraction)];
    }

    #[\Override]
    public function get_num_parts_right(array $response): array {
        $numright = 0;
        foreach ($this->answers as $key => $answer) {
            if ($this->is_full_fraction($answer, $response[$this->field($key)])) {
                $numright++;
            }
        }
        return [$numright, count($this->answers)];
    }

    /**
     * Get number of words in the response which are not right, but are if you ignore accents.
     *
     * @param array $response The answer list.
     * @return int The number of partial answers.
     */
    public function get_num_parts_partial(array $response): int {
        $numpartial = 0;
        foreach ($this->answers as $key => $answer) {
            if ($this->is_partial_fraction($answer, $response[$this->field($key)])) {
                $numpartial++;
            }
        }

        return $numpartial;
    }

    #[\Override]
    public function clear_wrong_from_response(array $response): array {
        foreach ($this->answers as $key => $answer) {
            if (isset($response[$this->field($key)]) && !$this->is_full_fraction($answer, $response[$this->field($key)])) {
                $response[$this->field($key)] = '';
            }
        }
        return $response;
    }

    /**
     * Verify if the response to one clue should receive full marks.
     *
     * The answer must satisfy at least one of two conditions: Either
     * Condition 1 - the answer is completely correct, including accent characters; or
     * Condition 2 - the answer has the same letter characters but incorrect accent characters
     * and the accent grading type of the question is disregarded.
     *
     * @param qtype_crossword\answer $answer The answer object.
     * @param string $responseword The inputanswer need to calculate.
     * @return bool The result of answer. True if it's correct.
     */
    public function is_full_fraction(qtype_crossword\answer $answer, string $responseword): bool {
        return $answer->is_correct($responseword) || ($this->accentgradingtype === \qtype_crossword::ACCENT_GRADING_IGNORE &&
                $answer->is_wrong_accents($responseword));
    }

    /**
     * Verify if if the response to one clue should receive partial marks.
     *
     * The answer must satisfy two conditions: Both
     * Condition 1 - the answer is wrong accent only; and
     * Condition 2 - the accent grading type of the question is penalty.
     *
     * @param qtype_crossword\answer $answer The answer object.
     * @param string $responseword The inputanswer need to calculate.
     * @return bool The result of answer. True if it's partial correct.
     */
    public function is_partial_fraction(qtype_crossword\answer $answer, string $responseword): bool {
        return $this->accentgradingtype === \qtype_crossword::ACCENT_GRADING_PENALTY &&
            $answer->is_wrong_accents($responseword);
    }

    /**
     * Calculate fraction of answer.
     *
     * @param answer $answer One of the clues.
     * @param string $responseword The the response given to that clue.
     * @return float the fraction for that word.
     */
    public function calculate_fraction_for_answer(answer $answer, string $responseword): float {

        if ($this->is_full_fraction($answer, $responseword)) {
            return 1;
        } else if ($this->is_partial_fraction($answer, $responseword)) {
            return 1 - $this->accentpenalty;
        } else {
            return 0;
        }
    }

    /**
     * Filter out blank words from a response.
     *
     * @param array $response The answers list.
     * @return array The filtered list.
     */
    private function remove_blank_words_from_response(array $response): array {
        return array_filter($response, function(string $responseword) {
            return core_text::strlen(trim(str_replace('_', '', $responseword))) > 0;
        });
    }

    #[\Override]
    public function check_file_access($qa, $options, $component, $filearea,
        $args, $forcedownload) {

        if ($component === 'qtype_crossword' && ($filearea === 'clue' || $filearea === 'feedback')) {
            foreach ($qa->get_question(false)->answers as $answer) {
                if ((int)$answer->answerid === (int)$args[0]) {
                    return true;
                }
            }
        } else if ($component === 'question' && in_array($filearea,
                ['correctfeedback', 'partiallycorrectfeedback', 'incorrectfeedback'])) {
            return $this->check_combined_feedback_file_access($qa, $options, $filearea, $args);
        } else if ($component === 'question' && $filearea === 'hint') {
            return $this->check_hint_file_access($qa, $options, $args);
        } else {
            return parent::check_file_access($qa, $options, $component, $filearea, $args, $forcedownload);
        }
    }
}
