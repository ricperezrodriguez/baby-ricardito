import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BathCard } from '@app/pages/home/cards/bath-card';
import { BottleCard } from '@app/pages/home/cards/bottle-card';
import { BreastPumpCard } from '@app/pages/home/cards/breast-pump-card';
import { BreastfeedingCard } from '@app/pages/home/cards/breastfeeding-card/breastfeeding-card';
import { DiaperCard } from '@app/pages/home/cards/diaper-card';
import { MedicalVisitCard } from '@app/pages/home/cards/medical-visit-card';
import { NailTrimmingCard } from '@app/pages/home/cards/nail-trimming-card';
import { SleepCard } from '@app/pages/home/cards/sleep-card';
import { VitaminDCard } from '@app/pages/home/cards/vitamin-d-card';

@Component({
  imports: [
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
