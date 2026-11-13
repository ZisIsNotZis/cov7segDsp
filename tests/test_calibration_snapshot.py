"""The legacy quiz must calibrate the actual edited glyph, not the preset."""
import unittest
from foundation.calibrate import DEFAULT, logits, trial_table


class SnapshotTests(unittest.TestCase):
    def test_edited_snapshot_controls_likelihood(self):
        old = {"font": "standard-dec", "shown": "6", "cover": None}
        edited = {**old, "glyphs": {"6": "1111111", "8": "1111111"}}
        self.assertGreater(logits(old, DEFAULT)["6"], logits(old, DEFAULT)["8"])
        self.assertGreater(logits(edited, DEFAULT)["8"], logits(edited, DEFAULT)["6"])

    def test_invalid_snapshot_is_rejected(self):
        for bad in ({}, {"6": "oops"}, {"unknown": "1111111"}):
            with self.assertRaises(ValueError):
                trial_table({"glyphs": bad})


if __name__ == "__main__":
    unittest.main()
