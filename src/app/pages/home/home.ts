import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BathCard } from '@app/pages/home/cards/bath-card';
import { BottleCard } from '@app/pages/home/cards/bottle-card/bottle-card';
import { BreastPumpCard } from '@app/pages/home/cards/breast-pump-card';
import { BreastfeedingCard } from '@app/pages/home/cards/breastfeeding-card/breastfeeding-card';
import { DiaperCard } from '@app/pages/home/cards/diaper-card/diaper-card';
import { MedicalVisitCard } from '@app/pages/home/cards/medical-visit-card';
import { NailTrimmingCard } from '@app/pages/home/cards/nail-trimming-card';
import { SleepCard } from '@app/pages/home/cards/sleep-card/sleep-card';
import { VitaminDCard } from '@app/pages/home/cards/vitamin-d-card';
import { DiaperPoopAlert } from '@app/pages/home/diaper-poop-alert/diaper-poop-alert';
import { FeedingOverdueAlert } from '@app/pages/home/feeding-overdue-alert/feeding-overdue-alert';
import { SleepAwakeAlert } from '@app/pages/home/sleep-awake-alert/sleep-awake-alert';
import { SleepLongNapAlert } from '@app/pages/home/sleep-long-nap-alert/sleep-long-nap-alert';

@Component({
  imports: [
    FeedingOverdueAlert,
    DiaperPoopAlert,
    SleepAwakeAlert,
    SleepLongNapAlert,
    BreastfeedingCard,
    BottleCard,
    DiaperCard,
    SleepCard,
    VitaminDCard,
    NailTrimmingCard,
    BathCard,
    BreastPumpCard,
    MedicalVisitCard,
    RouterOutlet,
  ],
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {}
