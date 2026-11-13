"""Independent finite-channel checks. Run python tests/test_channels.py."""
from __future__ import annotations

import itertools
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from foundation.channels import (Channel, observations, collision, channel_graph,
                                 check_font, cover_family, capacity, extended_layouts)
from foundation.model import Layout
from foundation.layouts import seven_seg
from foundation.channel_experiments import hamming7, protected_hex


def brute_physical_observations(layout, p, channel):
    """All physical fault locations, including hidden/dormant failures."""
    result = set()
    for size in range(min(channel.budget, layout.n_segments) + 1):
        for locations in itertools.combinations(range(layout.n_segments), size):
            mask = sum(1 << i for i in locations)
            faulty = p & ~mask if channel.fault == "off" else p | mask if channel.fault == "on" else p ^ mask
            for name, cover in channel.covers:
                result.add((name if channel.cover_known else "unknown", faulty & ~cover))
    return result


class ChannelTests(unittest.TestCase):
    def test_effective_enumerator_matches_physical_faults(self):
        layout = Layout("small", ("a", "b", "c"), {"l":1,"r":2})
        for known, fault, k, p in itertools.product((True,False), ("off","on","flip"), range(3), range(8)):
            ch = Channel(tuple(layout.covers.items()), fault, k, known)
            self.assertEqual(set(observations(layout,p,ch)), brute_physical_observations(layout,p,ch))

    def test_graph_and_witness_match_brute_definition(self):
        layout = Layout("small", ("a", "b", "c"), {"l":1,"r":2})
        for known, fault, k, task in itertools.product((True,False),("off","on","flip"),range(3),("detection","correction")):
            ch = Channel(tuple(layout.covers.items()),fault,k,known)
            clean = Channel(ch.covers,fault,0,known)
            graph = channel_graph(layout,ch,task)
            for p,q in itertools.combinations(range(8),2):
                op,oq = brute_physical_observations(layout,p,ch),brute_physical_observations(layout,q,ch)
                cp,cq = brute_physical_observations(layout,p,clean),brute_physical_observations(layout,q,clean)
                expected = bool(op & oq) if task=="correction" else bool((op & cq)|(cp & oq))
                witness = collision(layout,p,q,ch,task)
                self.assertEqual(bool(graph[p] >> q & 1), expected)
                self.assertEqual(witness is not None,expected)
                if witness:
                    for source, side in ((p,"first"),(q,"second")):
                        w = witness[side]
                        visible = source & ~w["cover_mask"]
                        self.assertEqual(visible ^ w["fault_mask"],w["received"])
                        self.assertLessEqual(w["fault_count"],k)
                    self.assertEqual(witness["first"]["received"],witness["second"]["received"])
                    if task == "detection":
                        self.assertTrue(witness["first"]["fault_count"]==0 or witness["second"]["fault_count"]==0)

    def test_detection_is_weaker_than_correction(self):
        layout = Layout("two",("a","b"),{})
        ch = Channel(fault="flip",budget=1)
        self.assertIsNone(collision(layout,0,3,ch,"detection"))
        self.assertIsNotNone(collision(layout,0,3,ch,"correction"))

    def test_invisible_fault_does_not_mean_detectable_hardware(self):
        l = seven_seg()
        ch = Channel(cover_family(l,"lr"),"off",1)
        self.assertEqual(observations(l,0,ch)[("left",0)]["fault_count"],0)

    def test_known_cover_is_information(self):
        l = Layout("two",("a","b"),{"l":1,"r":2})
        known = Channel(tuple(l.covers.items()),budget=0)
        unknown = Channel(tuple(l.covers.items()),budget=0,cover_known=False)
        self.assertIsNone(collision(l,1,2,known))
        self.assertIsNotNone(collision(l,1,2,unknown))

    def test_exact_seven_segment_limits(self):
        l = seven_seg()
        expected = [("lr","off",0,"correction",32),
                    ("all","off",0,"correction",32),
                    ("both-lr","off",0,"correction",8),
                    ("lr","off",1,"detection",16),
                    ("lr","off",1,"correction",6),
                    ("lr","flip",1,"correction",4),
                    ("none","flip",1,"correction",16),
                    ("all","off",1,"correction",6)]
        for mode,fault,k,task,value in expected:
            channel = Channel(cover_family(l,mode),fault,k)
            result = capacity(l,channel,task,timeout=2)
            self.assertEqual(result["status"],"exact")
            self.assertEqual(result["value"],value)
            self.assertTrue(check_font(l,{str(i):p for i,p in enumerate(result["patterns"])},channel,task)["ok"])

    def test_protected_hamming_construction(self):
        words = hamming7()
        self.assertEqual(len(words),16)
        self.assertEqual(min((p^q).bit_count() for p,q in itertools.combinations(words,2)),3)
        layout = extended_layouts()["split-x15"]
        font = protected_hex(layout)
        for known in (True,False):
            for mode in ("lr","all","both-lr","all-simultaneous"):
                channel = Channel(cover_family(layout,mode),"flip",1,known)
                self.assertTrue(check_font(layout,font,channel)["ok"])

    def test_layout_geometry_is_explicit(self):
        layouts = extended_layouts()
        for key,n in (("seven",7),("cell-x11",11),("split-x15",15),("pixels9",9),("grid16",16)):
            self.assertEqual(layouts[key].n_segments,n)
        self.assertEqual(len(layouts["grid16"].geometry),16)


if __name__ == "__main__":
    unittest.main()
